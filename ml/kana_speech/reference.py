"""The exported network in plain NumPy: exactly the arithmetic the app does in TypeScript.

Used to check that an export behaves like the trained model, and to write the golden files the
TypeScript tests compare against.
"""

import numpy as np


def conv2d(x, w, b, stride, pad):
    """x (C, H, W), w (O, C, kh, kw) → (O, H', W')."""
    _c, h, wd = x.shape
    o, _, kh, kw = w.shape
    sh, sw = stride
    ph, pw = pad
    xp = np.pad(x, ((0, 0), (ph, ph), (pw, pw)))
    oh = (h + 2 * ph - kh) // sh + 1
    ow = (wd + 2 * pw - kw) // sw + 1
    out = np.zeros((o, oh, ow), dtype=np.float32)
    for i in range(kh):
        for j in range(kw):
            patch = xp[:, i : i + sh * oh : sh, j : j + sw * ow : sw]  # (C, oh, ow)
            out += np.einsum("oc,chw->ohw", w[:, :, i, j], patch)
    return out + b[:, None, None]


def depthwise(x, w, b, stride):
    """x (C, H, W), w (C, 3, 3), padding 1."""
    c, h, wd = x.shape
    xp = np.pad(x, ((0, 0), (1, 1), (1, 1)))
    oh = (h + 2 - 3) // stride + 1
    ow = (wd + 2 - 3) // stride + 1
    out = np.zeros((c, oh, ow), dtype=np.float32)
    for i in range(3):
        for j in range(3):
            patch = xp[:, i : i + stride * oh : stride, j : j + stride * ow : stride]
            out += w[:, i, j][:, None, None] * patch
    return out + b[:, None, None]


def forward(spec: np.ndarray, layers: dict) -> np.ndarray:
    """Logits for one spectrogram (FRAMES, N_MELS), with `layers` as written by export.py."""
    x = spec[None].astype(np.float32)
    c = layers["conv"]
    stride = layers.get("time_stride", 2)
    x = np.maximum(0, conv2d(x, c["w"], c["b"], (stride, 2), (4 if stride == 2 else 5, 1)))
    for i, blk in enumerate(layers["blocks"]):
        x = np.maximum(0, depthwise(x, blk["dw"]["w"], blk["dw"]["b"], 2 if i == 0 else 1))
        pw = blk["pw"]
        x = np.maximum(0, np.einsum("oc,chw->ohw", pw["w"], x) + pw["b"][:, None, None])
    pooled = x.mean(axis=(1, 2))
    if layers.get("pool", "mean") == "meanmax":
        pooled = np.concatenate([pooled, x.max(axis=(1, 2))])
    fc = layers["fc"]
    return fc["w"] @ pooled + fc["b"]


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / temperature
    e = np.exp(z - z.max())
    return e / e.sum()
