"""Train the kana speech model.

    uv run python -m kana_speech.train [--epochs 40] [--name v1]

Reads the generated clips (data/clips) of the voices in voices.json, trains on the "train" split
and keeps the checkpoint that does best on the "val" voices (with noise). Writes runs/{name}/:
model.pt, history.json, and the calibration temperature.
"""

import argparse
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

from . import augment as A
from .classes import NO_KANA_INDEX, load_voices
from .features import WINDOW, LogMel
from .generate import DATA
from .model import KanaNet, count_macs

RUNS = Path(__file__).resolve().parent.parent / "runs"
CLASSES = NO_KANA_INDEX + 1


@dataclass
class Clips:
    audio: list[torch.Tensor]
    labels: torch.Tensor
    styles: torch.Tensor


def load_split(split: str, morphs: bool = True) -> Clips:
    """The clips of one split. Training also gets the morphed voices (made from training voices
    only), unless `morphs` is off."""
    audio, labels, styles = [], [], []
    names = [
        (v["id"], f"{v['character']} {v['style']}") for v in load_voices() if v["split"] == split
    ]
    morph_list = DATA / "morphs.json"
    if split == "train" and morphs and morph_list.exists():
        # Morphs get negative style numbers, so they can be told apart.
        names += [(m, f"morph {m}") for m in json.loads(morph_list.read_text())]
    for n, (style, name) in enumerate(names):
        path = DATA / "clips" / f"{style}.npz"
        if not path.exists():
            print(f"  missing {path.name} ({name}): not generated yet")
            continue
        d = np.load(path)
        o = d["offsets"]
        tag = style if isinstance(style, int) else -1 - n
        for i, label in enumerate(d["labels"]):
            audio.append(torch.from_numpy(d["audio"][o[i] : o[i + 1]].astype(np.float32) / 32768))
            labels.append(int(label))
            styles.append(tag)
    return Clips(audio, torch.tensor(labels), torch.tensor(styles))


def pick_device() -> torch.device:
    return torch.device("mps" if torch.backends.mps.is_available() else "cpu")


class Batcher:
    """Turns clips into augmented spectrograms."""

    def __init__(
        self, clips: Clips, device, seed: int, augment: float = 1.0, only: set[str] | None = None
    ):
        self.clips = clips
        #: Augmentations to use (all when None): speed, room, noise, clip, warp, eq, mask.
        self.only = only
        #: How strongly to augment, 0 (clean) to 1 (everything).
        self.strength = augment
        self.device = device
        self.gen = torch.Generator().manual_seed(seed)
        self.logmel = LogMel().to(device)

    def rand(self, *shape) -> torch.Tensor:
        return torch.rand(*shape, generator=self.gen)

    def audio(self, idx: torch.Tensor, train: bool) -> torch.Tensor:
        clips = [self.clips.audio[i] for i in idx.tolist()]
        if train and (self.only is None or "speed" in self.only) and self.strength > 0:
            clips = [
                A.speed(c, 0.9 + 0.22 * float(self.rand(1))) if self.rand(1) < 0.5 else c
                for c in clips
            ]
        return A.place(clips, self.gen, jitter=train).to(self.device)

    def babble(self, audio: torch.Tensor) -> torch.Tensor:
        """Speech-like noise: four other examples of the batch at once, each shifted in time."""
        n = len(audio)
        mix = torch.zeros_like(audio)
        for _ in range(4):
            perm = torch.randperm(n, generator=self.gen).to(audio.device)
            shift = int(torch.randint(0, WINDOW, (1,), generator=self.gen))
            mix = mix + torch.roll(audio[perm], shift, dims=1)
        return mix

    def train_batch(self, idx: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        if self.strength == 0:
            audio = self.audio(idx, train=True)
            return self.logmel(audio), self.clips.labels[idx].to(self.device)
        labels = self.clips.labels[idx].clone()
        audio = self.audio(idx, train=True)
        b, dev = len(idx), self.device
        on = (lambda name: 1.0) if self.only is None else (lambda name: float(name in self.only))
        k = self.strength
        # Some examples become "no kana": the window without the speech (noise or silence only).
        empty = (self.rand(b) < 0.06).to(dev)
        audio = torch.where(empty[:, None], torch.zeros_like(audio), audio)
        labels[empty.cpu()] = NO_KANA_INDEX
        gain = 10 ** ((self.rand(b, 1) * 30 - 20) / 20)
        audio = audio * gain.to(dev)
        audio = A.room(audio, p=0.4 * k * on("room"))
        audio = A.add_noise(audio, self.babble(audio), p=0.7 * k * on("noise"))
        # Now and then a microphone that clips.
        clip = (self.rand(b, 1) < 0.1 * k * on("clip")).to(dev)
        limit = audio.abs().amax(dim=1, keepdim=True) * (0.3 + 0.5 * self.rand(b, 1).to(dev))
        audio = torch.where(clip, audio.clamp(-limit, limit), audio)
        # Vocal tract length: 0.8 (higher, child-like) to 1.25 (deeper, male).
        warp = self.rand(b) < 0.8 * k * on("warp")
        alpha = torch.where(warp, 0.8 * (1.25 / 0.8) ** self.rand(b), torch.ones(b))
        eq = A.mic_eq(b, dev, p=0.7 * k * on("eq"))
        spec = self.logmel(audio, eq=eq, warp=A.warp_matrix(alpha.to(dev)))
        use = (self.rand(b) < 0.5 * k * on("mask")).to(dev)
        masked = A.spec_augment(spec, lambda n: self.rand(n).to(dev))
        spec = torch.where(use[:, None, None], masked, spec)
        return spec, labels.to(dev)

    def eval_batch(self, idx: torch.Tensor, noisy: bool) -> tuple[torch.Tensor, torch.Tensor]:
        audio = self.audio(idx, train=False)
        if noisy:
            audio = A.add_noise(audio, self.babble(audio), p=1.0)
        return self.logmel(audio), self.clips.labels[idx].to(self.device)


@torch.no_grad()
def logits_for(model, batcher: Batcher, noisy: bool, seed: int = 0) -> tuple[torch.Tensor, ...]:
    model.eval()
    batcher.gen.manual_seed(seed)
    torch.manual_seed(seed)
    out, labels = [], []
    order = torch.arange(len(batcher.clips.labels))
    for start in range(0, len(order), 512):
        spec, y = batcher.eval_batch(order[start : start + 512], noisy)
        out.append(model(spec).float().cpu())
        labels.append(y.cpu())
    return torch.cat(out), torch.cat(labels)


def fit_temperature(logits: torch.Tensor, labels: torch.Tensor) -> float:
    """The temperature that makes the probabilities honest on these examples."""
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=100)

    def closure():
        opt.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), labels)
        loss.backward()
        return loss

    opt.step(closure)
    return float(log_t.detach().exp())


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--name", default="v1")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch", type=int, default=256)
    parser.add_argument("--lr", type=float, default=3e-3)
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=5)
    parser.add_argument("--time-stride", type=int, default=2)
    parser.add_argument("--pool", default="mean", choices=["mean", "meanmax"])
    parser.add_argument("--only", help="comma-separated augmentations to use (default: all)")
    parser.add_argument("--norm", default="global", choices=["global", "band"])
    parser.add_argument("--no-morphs", action="store_true", help="leave out the morphed voices")
    parser.add_argument("--dropout", type=float, default=0.2)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--augment", type=float, default=1.0, help="0 = no augmentation")
    parser.add_argument(
        "--warmup", type=float, default=0.25, help="share of epochs to ramp augmentation up over"
    )
    args = parser.parse_args()
    torch.manual_seed(args.seed)
    device = pick_device()
    out = RUNS / args.name
    out.mkdir(parents=True, exist_ok=True)

    print("loading clips")
    train, val = load_split("train", morphs=not args.no_morphs), load_split("val")
    print(f"  train {len(train.labels)} clips, val {len(val.labels)} clips; device {device}")
    model = KanaNet(
        CLASSES,
        args.channels,
        args.blocks,
        dropout=args.dropout,
        time_stride=args.time_stride,
        pool=args.pool,
    ).to(device)
    params = sum(p.numel() for p in model.parameters())
    print(f"  model: {params:,} parameters, {count_macs(model) / 1e6:.1f}M multiply-adds")

    only = set(args.only.split(",")) if args.only else None
    batcher = Batcher(train, device, args.seed, args.augment, only)
    val_batcher = Batcher(val, device, args.seed + 1)
    batcher.logmel.norm = val_batcher.logmel.norm = args.norm
    steps_per_epoch = math.ceil(len(train.labels) / args.batch)
    total = steps_per_epoch * args.epochs
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, args.lr, total_steps=total, pct_start=0.1)
    history, best = [], -1.0
    for epoch in range(args.epochs):
        model.train()
        if args.augment:
            # Start gentle (a third of the augmentation) and reach full strength after the warm-up.
            ramp = min(1.0, (epoch + 1) / max(1, args.warmup * args.epochs))
            batcher.strength = args.augment * (1 / 3 + 2 / 3 * ramp)
        t0 = time.time()
        perm = torch.randperm(len(train.labels), generator=batcher.gen)
        losses, correct = [], 0
        for s in range(steps_per_epoch):
            idx = perm[s * args.batch : (s + 1) * args.batch]
            spec, y = batcher.train_batch(idx)
            logits = model(spec)
            loss = F.cross_entropy(logits, y, label_smoothing=0.1)
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
            losses.append(loss.item())
            correct += (logits.argmax(1) == y).sum().item()
        clean = logits_for(model, val_batcher, noisy=False)
        noisy = logits_for(model, val_batcher, noisy=True)
        acc = {
            k: (lg.argmax(1) == y).float().mean().item()
            for k, (lg, y) in {"clean": clean, "noisy": noisy}.items()
        }
        row = {
            "epoch": epoch + 1,
            "loss": float(np.mean(losses)),
            "train_acc": correct / len(perm),
            "val_clean": acc["clean"],
            "val_noisy": acc["noisy"],
            "seconds": time.time() - t0,
        }
        history.append(row)
        print(
            f"epoch {row['epoch']:3d}  loss {row['loss']:.3f}  train {row['train_acc']:.3f}  "
            f"val clean {acc['clean']:.3f}  noisy {acc['noisy']:.3f}  ({row['seconds']:.0f}s)"
        )
        if acc["noisy"] > best:
            best = acc["noisy"]
            torch.save(
                {"config": model.config, "state": model.state_dict(), "norm": args.norm},
                out / "model.pt",
            )
        (out / "history.json").write_text(json.dumps(history, indent=1))

    state = torch.load(out / "model.pt", map_location=device)
    model.load_state_dict(state["state"])
    temperature = fit_temperature(*logits_for(model, val_batcher, noisy=True))
    (out / "calibration.json").write_text(json.dumps({"temperature": temperature}))
    print(f"best val (noisy) {best:.3f}; temperature {temperature:.2f}")


if __name__ == "__main__":
    main()
