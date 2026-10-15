"""Evaluate a trained model on the held-out test voices and write a report.

    uv run python -m kana_speech.evaluate [--name v1]

Writes reports/{name}.md (committed with the model) and runs/{name}/report.json. The go/no-go
thresholds are the plan's (docs/plan-kana-speech-model.md).
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from . import augment as A
from .classes import NO_KANA_INDEX, class_ids, load_classes, load_voices
from .features import WINDOW
from .model import KanaNet, count_macs
from .train import RUNS, Batcher, load_split, logits_for, pick_device

REPORTS = Path(__file__).resolve().parent.parent / "reports"
GO = {"top1": 0.90, "top3": 0.98, "pairs": 0.90}
#: Sounds learners mix up: their accuracy is reported, and す/つ and し/ち must pass.
PAIRS = [
    ("su", "tsu"),
    ("shi", "chi"),
    ("tsu", "zu"),
    ("fu", "ho"),
    ("fu", "u"),
    ("ra", "da"),
    ("ra", "na"),
    ("n", "mu"),
    ("ru", "nu"),
    ("ji", "zu"),
    ("pya", "bya"),
    ("o", "wa"),
]
MUST_PASS = [("su", "tsu"), ("shi", "chi")]


def topk(logits: torch.Tensor, labels: torch.Tensor, k: int) -> float:
    return (logits.topk(k, dim=1).indices == labels[:, None]).any(dim=1).float().mean().item()


def calibration_error(probs: torch.Tensor, labels: torch.Tensor, bins: int = 10) -> float:
    """Expected calibration error: how far confidence is from accuracy, on average."""
    conf, pred = probs.max(dim=1)
    right = (pred == labels).float()
    ece = 0.0
    for lo in np.linspace(0, 1, bins, endpoint=False):
        m = (conf > lo) & (conf <= lo + 1 / bins)
        if m.any():
            ece += m.float().mean().item() * abs(right[m].mean().item() - conf[m].mean().item())
    return ece


@torch.no_grad()
def noise_only(model, batcher: Batcher, n: int = 600) -> float:
    """Share of windows without speech (noise, hum, babble, silence) answered with "no kana"."""
    model.eval()
    batcher.gen.manual_seed(5)
    torch.manual_seed(5)
    audio = torch.zeros(n, WINDOW, device=batcher.device)
    speech = batcher.audio(torch.randint(0, len(batcher.clips.labels), (n,)), train=False)
    audio = A.add_noise(audio + 1e-3 * torch.randn_like(audio), batcher.babble(speech), p=1.0)
    audio[: n // 6] = 0  # some plain silence (plus the noise floor)
    pred = model(batcher.logmel(audio)).argmax(1)
    return (pred == NO_KANA_INDEX).float().mean().item()


@torch.no_grad()
def roomy(model, batcher: Batcher):
    """Room echo and noise together."""
    model.eval()
    batcher.gen.manual_seed(7)
    torch.manual_seed(7)
    out, labels = [], []
    order = torch.arange(len(batcher.clips.labels))
    for s in range(0, len(order), 512):
        idx = order[s : s + 512]
        audio = A.room(batcher.audio(idx, train=False), p=1.0)
        audio = A.add_noise(audio, batcher.babble(audio), p=1.0)
        out.append(model(batcher.logmel(audio)).float().cpu())
        labels.append(batcher.clips.labels[idx])
    return torch.cat(out), torch.cat(labels)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--name", default="v1")
    args = parser.parse_args()
    run = RUNS / args.name
    device = pick_device()
    state = torch.load(run / "model.pt", map_location=device)
    model = KanaNet(**state["config"]).to(device)
    model.load_state_dict(state["state"])
    temperature = json.loads((run / "calibration.json").read_text())["temperature"]
    ids = class_ids()
    hira = {c["id"]: c["hiragana"] for c in load_classes()} | {"_": "(no kana)"}

    test = load_split("test")
    batcher = Batcher(test, device, seed=3)
    conditions = {
        "clean": logits_for(model, batcher, noisy=False),
        "noisy": logits_for(model, batcher, noisy=True, seed=4),
        "room + noise": roomy(model, batcher),
    }
    rows = {}
    for name, (lg, y) in conditions.items():
        kana = y != NO_KANA_INDEX
        rows[name] = {
            "top1": topk(lg[kana], y[kana], 1),
            "top3": topk(lg[kana], y[kana], 3),
            "rejected": (lg[kana].argmax(1) == NO_KANA_INDEX).float().mean().item(),
            "pairs_no_kana": (lg[~kana].argmax(1) == NO_KANA_INDEX).float().mean().item(),
            "ece": calibration_error(torch.softmax(lg / temperature, 1), y),
        }
    noise_rejected = noise_only(model, batcher)

    # Per sound, and the pairs that matter, in the noisy condition.
    lg, y = conditions["noisy"]
    pred = lg.argmax(1)
    per_class = {ids[c]: (pred[y == c] == c).float().mean().item() for c in range(NO_KANA_INDEX)}
    idx = {c: i for i, c in enumerate(ids)}
    pairs = []
    for a, b in PAIRS:
        ma, mb = y == idx[a], y == idx[b]
        pairs.append(
            {
                "pair": f"{a}/{b}",
                "kana": f"{hira[a]}/{hira[b]}",
                "acc": ((pred[ma] == idx[a]).sum() + (pred[mb] == idx[b]).sum()).item()
                / max(1, int(ma.sum() + mb.sum())),
                "a_as_b": (pred[ma] == idx[b]).float().mean().item(),
                "b_as_a": (pred[mb] == idx[a]).float().mean().item(),
            }
        )
    confusions = {}
    for t, p in zip(y.tolist(), pred.tolist()):
        if t != p:
            confusions[(t, p)] = confusions.get((t, p), 0) + 1
    worst = sorted(confusions.items(), key=lambda kv: -kv[1])[:15]
    per_test_voice = (y != NO_KANA_INDEX).sum().item() / max(1, len(set(test.styles.tolist())))

    must = {p["pair"]: p["acc"] for p in pairs if tuple(p["pair"].split("/")) in MUST_PASS}
    noisy = rows["noisy"]
    go = noisy["top1"] >= GO["top1"] and noisy["top3"] >= GO["top3"]
    go = go and all(v >= GO["pairs"] for v in must.values())
    summary = {
        "top1": round(noisy["top1"], 4),
        "top3": round(noisy["top3"], 4),
        "clean_top1": round(rows["clean"]["top1"], 4),
        "noise_rejected": round(noise_rejected, 4),
        "go": go,
    }
    (run / "report.json").write_text(
        json.dumps(
            {"summary": summary, "rows": rows, "pairs": pairs, "per_class": per_class}, indent=1
        )
    )

    voices = sorted({f"{v['character']}" for v in load_voices() if v["split"] == "test"})
    params = sum(p.numel() for p in model.parameters())
    lines = [
        f"# Kana speech model {args.name}: evaluation",
        "",
        (
            f"**Verdict: {'GO' if go else 'NO-GO'}** (thresholds: top-1 ≥ {GO['top1']:.0%}, top-3 ≥ "
            f"{GO['top3']:.0%}, す/つ and し/ち ≥ {GO['pairs']:.0%}, in the noisy condition)."
        ),
        "",
        (
            f"Model: {params:,} parameters, {count_macs(model) / 1e6:.1f}M multiply-adds per guess, "
            f"temperature {temperature:.2f}."
        ),
        (
            f"Test voices (never trained on): {', '.join(voices)}; {len(test.labels)} clips, about "
            f"{per_test_voice:.0f} kana clips per style."
        ),
        "",
        "## Accuracy",
        "",
        (
            '| Condition | Top-1 | Top-3 | Kana rejected as "no kana" | Two-kana clips → "no kana" '
            "| Calibration error |"
        ),
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for name, r in rows.items():
        lines.append(
            f"| {name} | {r['top1']:.1%} | {r['top3']:.1%} | {r['rejected']:.1%} | "
            f"{r['pairs_no_kana']:.1%} | {r['ece']:.3f} |"
        )
    lines += [
        "",
        (
            f'Windows without speech (noise, hum, babble, silence) answered "no kana": '
            f"{noise_rejected:.1%}."
        ),
        "",
        "Noisy: background noise 5–30 dB below the speech. Room: synthetic echo, RT60 0.1–0.6 s.",
        "",
        "## Sounds learners mix up (noisy)",
        "",
        "| Pair | Kana | Accuracy | First heard as second | Second heard as first |",
        "| --- | --- | --- | --- | --- |",
    ]
    for p in pairs:
        lines.append(
            f"| {p['pair']} | {p['kana']} | {p['acc']:.1%} | {p['a_as_b']:.1%} | {p['b_as_a']:.1%} |"
        )
    lines += [
        "",
        "## Most common mistakes (noisy)",
        "",
        "| Said | Heard | Times |",
        "| --- | --- | --- |",
    ]
    for (t, p), n in worst:
        lines.append(f"| {ids[t]} {hira[ids[t]]} | {ids[p]} {hira[ids[p]]} | {n} |")
    lines += ["", "## Weakest sounds (noisy)", "", "| Sound | Accuracy |", "| --- | --- |"]
    for c, a in sorted(per_class.items(), key=lambda kv: kv[1])[:15]:
        lines.append(f"| {c} {hira[c]} | {a:.1%} |")
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / f"{args.name}.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:20]))


if __name__ == "__main__":
    main()
