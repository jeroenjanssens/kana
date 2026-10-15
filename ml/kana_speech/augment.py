"""Make clean synthetic speech sound like a phone in a room: all on the GPU, in batches.

Each training example goes through, at random: speed change, placement in the 1 s window,
loudness, room echo, background noise (white, pink, brown, mains hum, or babble from other
clips), clipping; then, in the spectrum, a microphone's colour (EQ, band limits) and a warp of the
frequency axis (vocal tract length: deeper or higher voices); and finally SpecAugment masks.
"""

import math

import torch
import torch.nn.functional as F

from .features import N_FFT, SAMPLE_RATE, WINDOW

BINS = N_FFT // 2 + 1


def place(clips: list[torch.Tensor], gen: torch.Generator, jitter: bool = True) -> torch.Tensor:
    """Put each clip somewhere in a WINDOW of silence (the whole clip, if it fits)."""
    out = torch.zeros(len(clips), WINDOW)
    for i, c in enumerate(clips):
        c = c[:WINDOW]
        room = WINDOW - len(c)
        start = int(torch.randint(0, room + 1, (1,), generator=gen)) if jitter else room // 2
        out[i, start : start + len(c)] = c
    return out


def speed(clip: torch.Tensor, factor: float) -> torch.Tensor:
    """Resample by `factor` (faster and higher above 1), as a tape played at another speed."""
    n = max(2, round(len(clip) / factor))
    return F.interpolate(clip[None, None], size=n, mode="linear", align_corners=False)[0, 0]


def coloured_noise(b: int, n: int, exponent: torch.Tensor, device) -> torch.Tensor:
    """Noise with power ∝ 1/f^exponent: 0 white, 1 pink, 2 brown. Unit RMS."""
    spec = torch.fft.rfft(torch.randn(b, n, device=device))
    f = torch.arange(spec.shape[1], device=device).clamp(min=1).float()
    spec = spec / f[None] ** (exponent[:, None] / 2)
    noise = torch.fft.irfft(spec, n=n)
    return noise / noise.pow(2).mean(dim=1, keepdim=True).sqrt().clamp(min=1e-8)


def hum(b: int, n: int, device) -> torch.Tensor:
    t = torch.arange(n, device=device) / SAMPLE_RATE
    base = torch.where(torch.rand(b, device=device) < 0.5, 50.0, 60.0)[:, None]
    phase = torch.rand(b, 1, device=device) * 2 * math.pi
    out = sum(torch.sin(2 * math.pi * base * k * t + phase) / k for k in range(1, 6))
    return out / out.pow(2).mean(dim=1, keepdim=True).sqrt()


def room(audio: torch.Tensor, p: float) -> torch.Tensor:
    """Synthetic room echo: decaying noise as impulse response, RT60 0.1–0.6 s."""
    b, n = audio.shape
    use = torch.rand(b, device=audio.device) < p
    if not use.any():
        return audio
    length = int(0.3 * SAMPLE_RATE)
    t = torch.arange(length, device=audio.device) / SAMPLE_RATE
    rt60 = 0.1 + 0.5 * torch.rand(b, 1, device=audio.device)
    rir = torch.randn(b, length, device=audio.device) * torch.exp(-6.9 * t / rt60)
    rir[:, 0] = 1 / (0.05 + torch.rand(b, device=audio.device))  # the direct sound
    rir = rir / rir.norm(dim=1, keepdim=True)
    size = n + length
    wet = torch.fft.irfft(torch.fft.rfft(audio, size) * torch.fft.rfft(rir, size), size)[:, :n]
    wet = wet * (audio.norm(dim=1, keepdim=True) / wet.norm(dim=1, keepdim=True).clamp(min=1e-8))
    return torch.where(use[:, None], wet, audio)


def add_noise(audio: torch.Tensor, babble: torch.Tensor, p: float) -> torch.Tensor:
    """Background noise at 5–30 dB below the speech, and always a faint noise floor."""
    b, n = audio.shape
    dev = audio.device
    kind = torch.randint(0, 4, (b,), device=dev)
    noise = coloured_noise(b, n, torch.rand(b, device=dev) * 2, dev)
    noise = torch.where((kind == 1)[:, None], hum(b, n, dev), noise)
    bab = babble / babble.pow(2).mean(dim=1, keepdim=True).sqrt().clamp(min=1e-8)
    noise = torch.where((kind >= 2)[:, None], bab, noise)
    speech_rms = audio.pow(2).mean(dim=1, keepdim=True).sqrt()
    # Speech fills only part of the window: compare with its loud part, roughly.
    snr_db = 5 + 25 * torch.rand(b, 1, device=dev)
    level = speech_rms * 3 * 10 ** (-snr_db / 20)
    use = (torch.rand(b, 1, device=dev) < p).float()
    floor = 10 ** (-(50 + 25 * torch.rand(b, 1, device=dev)) / 20)
    white = torch.randn(b, n, device=dev)
    return audio + use * level * noise + floor * white


def mic_eq(b: int, device, p: float) -> torch.Tensor:
    """A random microphone colour, as a gain per FFT bin: a tilt, a few bumps, band limits."""
    f = torch.linspace(0, SAMPLE_RATE / 2, BINS, device=device)[None]
    octave = torch.log2(f.clamp(min=20) / 1000)
    gain_db = (torch.rand(b, 1, device=device) - 0.5) * 8 * octave
    for _ in range(3):
        centre = torch.rand(b, 1, device=device) * 5 - 2  # octaves around 1 kHz
        width = 0.3 + torch.rand(b, 1, device=device)
        height = (torch.rand(b, 1, device=device) - 0.5) * 12
        gain_db = gain_db + height * torch.exp(-(((octave - centre) / width) ** 2))
    # Phones and laptops roll off below 100–200 Hz; deeper cuts would remove voicing (だ vs た).
    low = 60 + 120 * torch.rand(b, 1, device=device)
    high = 3500 + 4500 * torch.rand(b, 1, device=device)
    band = torch.sigmoid((f - low) / 20) * torch.sigmoid((high - f) / 200)
    eq = 10 ** (gain_db / 10) * band
    use = torch.rand(b, 1, device=device) < p
    return torch.where(use, eq, torch.ones_like(eq)).clamp(min=1e-4)


def warp_matrix(alpha: torch.Tensor) -> torch.Tensor:
    """(B, BINS, BINS) linear interpolation: out[f] = in[alpha · f]. alpha > 1: deeper voice."""
    b = alpha.shape[0]
    src = torch.arange(BINS, device=alpha.device)[None].float() * alpha[:, None]
    lo = src.floor().clamp(max=BINS - 1)
    frac = (src - lo)[..., None]
    lo = lo.long()
    hi = (lo + 1).clamp(max=BINS - 1)
    m = torch.zeros(b, BINS, BINS, device=alpha.device)
    m.scatter_add_(2, lo[..., None], 1 - frac)
    m.scatter_add_(2, hi[..., None], frac)
    # Beyond the top of the spectrum there's nothing: silence.
    m = m * (src < BINS - 1)[..., None].float()
    return m


def spec_augment(spec: torch.Tensor, gen_device_rand) -> torch.Tensor:
    """Two masks over a few mel bands and two over a few frames (never a whole burst)."""
    b, t, m = spec.shape
    out = spec.clone()
    for _ in range(2):
        width = (gen_device_rand(b) * 4).long()
        start = (gen_device_rand(b) * (m - width)).long()
        idx = torch.arange(m, device=spec.device)[None]
        mask = (idx >= start[:, None]) & (idx < (start + width)[:, None])
        out = out.masked_fill(mask[:, None, :], 0.0)
    for _ in range(2):
        width = (gen_device_rand(b) * 5).long()
        start = (gen_device_rand(b) * (t - width)).long()
        idx = torch.arange(t, device=spec.device)[None]
        mask = (idx >= start[:, None]) & (idx < (start + width)[:, None])
        out = out.masked_fill(mask[:, :, None], 0.0)
    return out
