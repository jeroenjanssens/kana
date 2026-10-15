"""Golden files for the app's TypeScript tests: features and network outputs from the reference.

    uv run python -m kana_speech.fixtures

Uses small networks with fixed random weights (not the trained model), so the TypeScript side
can be checked independently of training: tests/fixtures/speech/parity*.json, one per network
shape.
"""

import base64
import json

import numpy as np
import torch

from . import reference
from .classes import class_ids
from .export import ROOT, dequantized, layers_of, write_binary
from .features import SAMPLE_RATE, WINDOW, logmel
from .model import KanaNet

OUT = ROOT / "tests" / "fixtures" / "speech"


def test_audio() -> np.ndarray:
    """A made-up "syllable": a burst of noise, then a gliding vowel-like tone with harmonics."""
    rng = np.random.default_rng(42)
    t = np.arange(WINDOW) / SAMPLE_RATE
    audio = 0.002 * rng.normal(size=WINDOW)
    burst = (t > 0.30) & (t < 0.42)
    audio[burst] += 0.05 * rng.normal(size=burst.sum())
    vowel = (t > 0.42) & (t < 0.70)
    f0 = 140 + 60 * (t - 0.42)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE
    audio[vowel] += sum(0.2 / k * np.sin(k * phase[vowel]) for k in range(1, 12))
    return np.round(np.clip(audio, -1, 1) * 32767).astype("<i2")


def write(name: str, **config):
    torch.manual_seed(7)
    model = KanaNet(102, channels=16, blocks=3, **config)
    with torch.no_grad():
        for m in model.modules():
            if isinstance(m, torch.nn.BatchNorm2d):
                m.running_mean.uniform_(-0.5, 0.5)
                m.running_var.uniform_(0.5, 2)
                m.weight.uniform_(0.5, 1.5)
                m.bias.uniform_(-0.2, 0.2)
    model.eval()
    layers = layers_of(model)
    out = OUT / f"{name}.json"
    tmp = out.with_suffix(".bin")
    OUT.mkdir(parents=True, exist_ok=True)
    index = write_binary(layers, tmp)
    blob = tmp.read_bytes()
    tmp.unlink()

    pcm = test_audio()
    audio = pcm.astype(np.float32) / 32767
    spec = logmel(audio)
    logits = reference.forward(spec, dequantized(layers))
    meta = {
        "version": "parity",
        "classes": class_ids(),
        "temperature": 1.5,
        "network": {**model.config, "tensors": index},
    }
    out.write_text(
        json.dumps(
            {
                "pcm16": base64.b64encode(pcm.tobytes()).decode(),
                "features": np.round(spec, 6).tolist(),
                "meta": meta,
                "bin": base64.b64encode(blob).decode(),
                "logits": np.round(logits, 6).tolist(),
            }
        )
        + "\n"
    )
    print(f"{out.relative_to(ROOT)}: {out.stat().st_size / 1024:.0f} KB")


def main():
    write("parity")
    # Finer time steps and max pooling as well as the mean.
    write("parity-fine", time_stride=1, pool="meanmax")


if __name__ == "__main__":
    main()
