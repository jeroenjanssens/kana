import numpy as np
import torch

from kana_speech.features import FRAMES, N_MELS, WINDOW, LogMel, logmel, mel_filters


def test_mel_filters_cover_the_range_once():
    f = mel_filters()
    assert f.shape == (N_MELS, 257)
    assert f.max() <= 1.0
    # Every filter has some weight, and they overlap only with their neighbours.
    assert (f.sum(axis=1) > 0).all()
    assert ((f > 0).sum(axis=0) <= 2).all()


def test_logmel_shape_and_normalisation():
    rng = np.random.default_rng(1)
    spec = logmel(rng.uniform(-0.1, 0.1, WINDOW))
    assert spec.shape == (FRAMES, N_MELS)
    assert abs(spec.mean()) < 1e-4
    assert abs(spec.std() - 1) < 1e-3


def test_loudness_doesnt_change_the_spectrogram():
    rng = np.random.default_rng(2)
    audio = rng.normal(0, 0.05, WINDOW).astype(np.float32)
    assert np.allclose(logmel(audio), logmel(audio * 4), atol=1e-3)


def test_a_tone_lands_in_the_right_mel_band():
    t = np.arange(WINDOW) / 16_000
    spec = logmel(0.3 * np.sin(2 * np.pi * 1000 * t))
    band = spec.mean(axis=0).argmax()
    lo, hi = np.flatnonzero(mel_filters()[band])[[0, -1]] * 16_000 / 512
    assert lo <= 1000 <= hi


def test_torch_matches_numpy():
    rng = np.random.default_rng(3)
    batch = rng.normal(0, 0.1, (3, WINDOW)).astype(np.float32)
    batch[1] *= 0.01
    got = LogMel()(torch.from_numpy(batch)).numpy()
    want = np.stack([logmel(a) for a in batch])
    assert np.allclose(got, want, atol=1e-3)
