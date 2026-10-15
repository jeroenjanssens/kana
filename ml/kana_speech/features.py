"""Log-mel spectrograms: the model's input.

The app computes exactly the same thing in TypeScript (src/lib/speech/features.ts); golden files
in tests/fixtures/speech keep the two in step. `logmel` is the plain NumPy reference; `logmel_torch`
does the same in batches on the GPU for training.
"""

import numpy as np
import torch

SAMPLE_RATE = 16_000
#: The model hears one second.
WINDOW = SAMPLE_RATE
FRAME = 400  # 25 ms
HOP = 160  # 10 ms
N_FFT = 512
N_MELS = 40
F_MIN = 60.0
F_MAX = 7600.0
FRAMES = 1 + (WINDOW - FRAME) // HOP  # 98
#: Added before the log so silence doesn't become -infinity.
EPS = 1e-6


def hz_to_mel(f):
    return 2595.0 * np.log10(1.0 + np.asarray(f, dtype=np.float64) / 700.0)


def mel_to_hz(m):
    return 700.0 * (10.0 ** (np.asarray(m, dtype=np.float64) / 2595.0) - 1.0)


def mel_filters() -> np.ndarray:
    """Triangular mel filters, (N_MELS, N_FFT // 2 + 1), HTK mel scale, peak 1."""
    bins = N_FFT // 2 + 1
    freqs = np.arange(bins) * SAMPLE_RATE / N_FFT
    edges = mel_to_hz(np.linspace(hz_to_mel(F_MIN), hz_to_mel(F_MAX), N_MELS + 2))
    filters = np.zeros((N_MELS, bins))
    for m in range(N_MELS):
        lo, mid, hi = edges[m], edges[m + 1], edges[m + 2]
        rising = (freqs - lo) / (mid - lo)
        falling = (hi - freqs) / (hi - mid)
        filters[m] = np.maximum(0.0, np.minimum(rising, falling))
    return filters.astype(np.float32)


def hann() -> np.ndarray:
    """Periodic Hann window of FRAME samples."""
    n = np.arange(FRAME)
    return (0.5 - 0.5 * np.cos(2 * np.pi * n / FRAME)).astype(np.float32)


def normalize(spec: np.ndarray) -> np.ndarray:
    """Zero mean and unit variance over the whole spectrogram: evens out loudness."""
    return (spec - spec.mean()) / (spec.std() + 1e-5)


def logmel(audio: np.ndarray) -> np.ndarray:
    """Normalised log-mel spectrogram (FRAMES, N_MELS) of one WINDOW of 16 kHz audio in [-1, 1]."""
    audio = np.asarray(audio, dtype=np.float32)
    assert audio.shape == (WINDOW,), audio.shape
    window = hann()
    filters = mel_filters()
    frames = np.stack([audio[i * HOP : i * HOP + FRAME] * window for i in range(FRAMES)])
    power = np.abs(np.fft.rfft(frames, n=N_FFT, axis=1)) ** 2
    return normalize(np.log(power @ filters.T + EPS)).astype(np.float32)


class LogMel(torch.nn.Module):
    """`logmel` for a batch (B, WINDOW) → (B, FRAMES, N_MELS), on any device."""

    def __init__(self, norm: str = "global"):
        super().__init__()
        #: "global" normalises the whole spectrogram; "band" first removes each mel band's mean
        #: over time (the voice's and microphone's colour), then scales by the overall spread.
        self.norm = norm
        self.register_buffer("window", torch.from_numpy(hann()))
        self.register_buffer("filters", torch.from_numpy(mel_filters()).T.contiguous())

    def forward(
        self,
        audio: torch.Tensor,
        eq: torch.Tensor | None = None,
        warp: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """For training, optionally: `warp` (B, bins, bins) remaps the frequency axis (a deeper or
        higher voice), then `eq` (B, bins) scales the power spectrum (a microphone's colour)."""
        frames = audio.unfold(1, FRAME, HOP) * self.window
        power = torch.fft.rfft(frames, n=N_FFT, dim=-1).abs() ** 2
        if warp is not None:
            power = torch.bmm(power, warp.transpose(1, 2))
        if eq is not None:
            power = power * eq[:, None, :]
        spec = torch.log(power @ self.filters + EPS)
        if self.norm == "band":
            spec = spec - spec.mean(dim=1, keepdim=True)
        mean = spec.mean(dim=(1, 2), keepdim=True)
        std = spec.std(dim=(1, 2), keepdim=True, correction=0)
        return (spec - mean) / (std + 1e-5)
