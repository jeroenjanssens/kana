"""The network: a small depthwise-separable CNN (DS-CNN), as used for keyword spotting.

Only operations the app implements in TypeScript (src/lib/speech/model.ts): convolution,
depthwise convolution, 1×1 convolution, ReLU, global average pooling and a dense layer. Batch
norm is folded into the convolutions on export.
"""

import torch
from torch import nn

from .features import FRAMES, N_MELS


class Block(nn.Module):
    """Depthwise 3×3 convolution, then pointwise 1×1, each with batch norm and ReLU."""

    def __init__(self, channels: int, stride: int):
        super().__init__()
        self.depthwise = nn.Conv2d(channels, channels, 3, stride, 1, groups=channels, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.pointwise = nn.Conv2d(channels, channels, 1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        x = torch.relu(self.bn1(self.depthwise(x)))
        return torch.relu(self.bn2(self.pointwise(x)))


class KanaNet(nn.Module):
    """(B, FRAMES, N_MELS) log-mel spectrograms → (B, classes) logits."""

    def __init__(
        self,
        classes: int,
        channels: int = 128,
        blocks: int = 5,
        dropout: float = 0.2,
        time_stride: int = 2,
        pool: str = "mean",
    ):
        super().__init__()
        # 98×40 → 49×20 (or 98×20 with time_stride 1, keeping 10 ms steps for short bursts)
        self.conv = nn.Conv2d(
            1, channels, (10, 4), (time_stride, 2), (4 if time_stride == 2 else 5, 1), bias=False
        )
        self.bn = nn.BatchNorm2d(channels)
        # The first block halves again (25×10); the others keep the size.
        self.blocks = nn.Sequential(*(Block(channels, 2 if i == 0 else 1) for i in range(blocks)))
        self.dropout = nn.Dropout(dropout)
        #: "mean" averages over time and frequency; "meanmax" adds the maximum, which keeps short
        #: events (a burst, a click of voicing) from being averaged away.
        self.pool = pool
        self.fc = nn.Linear(channels * (2 if pool == "meanmax" else 1), classes)
        self.config = {
            "classes": classes,
            "channels": channels,
            "blocks": blocks,
            "time_stride": time_stride,
            "pool": pool,
        }

    def forward(self, spec: torch.Tensor) -> torch.Tensor:
        x = spec[:, None]
        x = torch.relu(self.bn(self.conv(x)))
        x = self.blocks(x)
        pooled = x.mean(dim=(2, 3))
        if self.pool == "meanmax":
            pooled = torch.cat([pooled, x.amax(dim=(2, 3))], dim=1)
        return self.fc(self.dropout(pooled))


def count_macs(model: KanaNet) -> int:
    """Multiply-adds for one input, to keep the browser's work in check."""
    c, n = model.config["channels"], model.config["blocks"]
    s = model.config["time_stride"]
    h, w = (FRAMES + 2 * (4 if s == 2 else 5) - 10) // s + 1, (N_MELS + 2 - 4) // 2 + 1
    macs = h * w * c * 10 * 4
    for i in range(n):
        if i == 0:
            h, w = (h + 2 - 3) // 2 + 1, (w + 2 - 3) // 2 + 1
        macs += h * w * c * 9 + h * w * c * c
    return macs + c * (2 if model.config["pool"] == "meanmax" else 1) * model.config["classes"]
