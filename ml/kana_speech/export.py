"""Export a trained model for the app: 8-bit weights and a description.

    uv run python -m kana_speech.export [--name v1]

Writes public/models/kana-speech-{name}.bin and .json. Batch norm is folded into the convolutions; every weight tensor
is stored as int8 with one float32 scale per output channel, and biases as float32.

Binary layout: the tensors one after another, each 4-byte aligned; the JSON lists each tensor's
name, shape, type and byte offset.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from . import reference
from .classes import class_ids
from .features import (
    EPS,
    F_MAX,
    F_MIN,
    FRAME,
    HOP,
    N_FFT,
    N_MELS,
    SAMPLE_RATE,
    WINDOW,
    logmel,
)
from .model import KanaNet
from .train import RUNS, load_split

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "public" / "models"


def fold(conv: torch.nn.Conv2d, bn: torch.nn.BatchNorm2d) -> tuple[np.ndarray, np.ndarray]:
    """A convolution followed by batch norm, as one convolution with a bias."""
    scale = bn.weight / torch.sqrt(bn.running_var + bn.eps)
    w = conv.weight * scale.view(-1, *([1] * (conv.weight.dim() - 1)))
    b = bn.bias - bn.running_mean * scale
    return w.detach().numpy().astype(np.float32), b.detach().numpy().astype(np.float32)


def quantize(w: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Symmetric int8 per output channel (axis 0)."""
    flat = w.reshape(w.shape[0], -1)
    scale = np.abs(flat).max(axis=1) / 127
    scale[scale == 0] = 1
    q = np.clip(np.round(flat / scale[:, None]), -127, 127).astype(np.int8)
    return q.reshape(w.shape), scale.astype(np.float32)


def layers_of(model: KanaNet) -> dict:
    """The network as float weights, batch norm folded."""
    w, b = fold(model.conv, model.bn)
    layers = {
        "conv": {"w": w, "b": b},
        "blocks": [],
        "time_stride": model.config["time_stride"],
        "pool": model.config["pool"],
    }
    for blk in model.blocks:
        dw, db = fold(blk.depthwise, blk.bn1)
        pw, pb = fold(blk.pointwise, blk.bn2)
        layers["blocks"].append(
            {"dw": {"w": dw[:, 0], "b": db}, "pw": {"w": pw[:, :, 0, 0], "b": pb}}
        )
    layers["fc"] = {
        "w": model.fc.weight.detach().numpy().astype(np.float32),
        "b": model.fc.bias.detach().numpy().astype(np.float32),
    }
    return layers


def dequantized(layers: dict) -> dict:
    """The weights as the app sees them: after int8 rounding."""

    def dq(w):
        q, s = quantize(w)
        return (q.astype(np.float32) * s.reshape(-1, *([1] * (w.ndim - 1)))).astype(np.float32)

    out = {
        "conv": {"w": dq(layers["conv"]["w"]), "b": layers["conv"]["b"]},
        "blocks": [],
        "time_stride": layers["time_stride"],
        "pool": layers["pool"],
    }
    for blk in layers["blocks"]:
        out["blocks"].append(
            {
                "dw": {"w": dq(blk["dw"]["w"]), "b": blk["dw"]["b"]},
                "pw": {"w": dq(blk["pw"]["w"]), "b": blk["pw"]["b"]},
            }
        )
    out["fc"] = {"w": dq(layers["fc"]["w"]), "b": layers["fc"]["b"]}
    return out


def tensors(layers: dict) -> list[tuple[str, np.ndarray]]:
    out = [("conv.w", layers["conv"]["w"]), ("conv.b", layers["conv"]["b"])]
    for i, blk in enumerate(layers["blocks"]):
        for part in ("dw", "pw"):
            out += [
                (f"blocks.{i}.{part}.w", blk[part]["w"]),
                (f"blocks.{i}.{part}.b", blk[part]["b"]),
            ]
    return out + [("fc.w", layers["fc"]["w"]), ("fc.b", layers["fc"]["b"])]


def write_binary(layers: dict, path: Path) -> list[dict]:
    blob = bytearray()
    index = []

    def append(name: str, kind: str, data: np.ndarray, shape: list[int]):
        while len(blob) % 4:
            blob.append(0)
        index.append({"name": name, "type": kind, "shape": shape, "offset": len(blob)})
        blob.extend(data.tobytes())

    for name, t in tensors(layers):
        if name.endswith(".w"):
            q, scale = quantize(t)
            append(name, "int8", q, list(t.shape))
            append(name.replace(".w", ".scale"), "float32", scale, [t.shape[0]])
        else:
            append(name, "float32", t.astype("<f4"), list(t.shape))
    path.write_bytes(bytes(blob))
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--name", default="v1")
    args = parser.parse_args()
    run = RUNS / args.name
    state = torch.load(run / "model.pt", map_location="cpu")
    model = KanaNet(**state["config"])
    model.load_state_dict(state["state"])
    model.eval()
    temperature = json.loads((run / "calibration.json").read_text())["temperature"]
    report = json.loads((run / "report.json").read_text()) if (run / "report.json").exists() else {}

    layers = layers_of(model)
    MODELS.mkdir(parents=True, exist_ok=True)
    base = f"kana-speech-{args.name}"
    index = write_binary(layers, MODELS / f"{base}.bin")
    meta = {
        "version": args.name,
        "classes": class_ids(),
        "temperature": temperature,
        "features": {
            "sampleRate": SAMPLE_RATE,
            "window": WINDOW,
            "frame": FRAME,
            "hop": HOP,
            "nFft": N_FFT,
            "nMels": N_MELS,
            "fMin": F_MIN,
            "fMax": F_MAX,
            "eps": EPS,
        },
        "network": {**state["config"], "tensors": index},
        "metrics": report.get("summary", {}),
    }
    (MODELS / f"{base}.json").write_text(json.dumps(meta, indent=1) + "\n")
    size = (MODELS / f"{base}.bin").stat().st_size
    print(f"{base}.bin: {size / 1024:.0f} KB")

    # The exported (int8) network must agree with the trained one.
    dq = dequantized(layers)
    test = load_split("test")
    rng = np.random.default_rng(0)
    picks = rng.choice(len(test.labels), size=min(200, len(test.labels)), replace=False)
    agree = 0
    for i in picks:
        clip = test.audio[i].numpy()[:WINDOW]
        audio = np.zeros(WINDOW, dtype=np.float32)
        start = (WINDOW - len(clip)) // 2
        audio[start : start + len(clip)] = clip
        spec = logmel(audio)
        with torch.no_grad():
            want = model(torch.from_numpy(spec)[None]).numpy()[0]
        got = reference.forward(spec, dq)
        agree += int(got.argmax() == want.argmax())
    print(f"int8 export agrees with the trained model on {agree}/{len(picks)} test clips")


if __name__ == "__main__":
    main()
