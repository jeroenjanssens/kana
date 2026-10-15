import numpy as np
import pytest
import torch

from kana_speech import augment as A
from kana_speech import reference
from kana_speech.export import dequantized, layers_of, quantize
from kana_speech.features import FRAMES, N_MELS, WINDOW, LogMel
from kana_speech.model import KanaNet, count_macs


def trained_like(seed=0, **config) -> KanaNet:
    """A model with non-trivial batch-norm statistics, in eval mode."""
    torch.manual_seed(seed)
    model = KanaNet(102, channels=16, blocks=3, **config)
    with torch.no_grad():
        for m in model.modules():
            if isinstance(m, torch.nn.BatchNorm2d):
                m.running_mean.uniform_(-0.5, 0.5)
                m.running_var.uniform_(0.5, 2)
                m.weight.uniform_(0.5, 1.5)
                m.bias.uniform_(-0.2, 0.2)
    return model.eval()


def test_shapes_and_cost():
    model = KanaNet(102)
    assert model(torch.zeros(2, FRAMES, N_MELS)).shape == (2, 102)
    assert sum(p.numel() for p in model.parameters()) < 200_000
    assert count_macs(model) < 40_000_000


@pytest.mark.parametrize(
    "config", [{}, {"time_stride": 1, "pool": "meanmax"}], ids=["default", "fine"]
)
def test_reference_matches_torch_with_batch_norm_folded(config):
    model = trained_like(**config)
    spec = torch.randn(1, FRAMES, N_MELS)
    with torch.no_grad():
        want = model(spec).numpy()[0]
    got = reference.forward(spec.numpy()[0], layers_of(model))
    assert np.allclose(got, want, atol=1e-4)


def test_int8_weights_stay_close():
    model = trained_like(1)
    spec = torch.randn(1, FRAMES, N_MELS)
    exact = reference.forward(spec.numpy()[0], layers_of(model))
    rounded = reference.forward(spec.numpy()[0], dequantized(layers_of(model)))
    assert np.abs(exact - rounded).max() < 0.05 * np.abs(exact).max()


def test_quantize_per_channel():
    w = np.array([[1.0, -0.5], [0.01, 0.02]], dtype=np.float32)
    q, scale = quantize(w)
    assert q.dtype == np.int8
    assert (np.abs(q).max(axis=1) == 127).all()
    assert np.allclose(q * scale[:, None], w, atol=scale.max())


def test_augmentations_keep_shapes():
    gen = torch.Generator().manual_seed(0)
    audio = A.place([torch.ones(4000), torch.ones(20_000)], gen)
    assert audio.shape == (2, WINDOW)
    assert audio[0].sum() == 4000 and audio[1].sum() == WINDOW
    assert A.room(audio, p=1).shape == audio.shape
    noisy = A.add_noise(audio, torch.randn(2, WINDOW), p=1)
    assert noisy.shape == audio.shape and torch.isfinite(noisy).all()
    assert A.mic_eq(2, "cpu", p=1).shape == (2, A.BINS)
    assert len(A.speed(torch.ones(1000), 1.25)) == 800


def test_no_warp_is_identity():
    audio = torch.randn(2, WINDOW) * 0.1
    logmel = LogMel()
    plain = logmel(audio)
    warped = logmel(audio, warp=A.warp_matrix(torch.ones(2)))
    assert torch.allclose(plain, warped, atol=1e-4)
    deeper = logmel(audio, warp=A.warp_matrix(torch.tensor([1.15, 0.9])))
    assert not torch.allclose(plain, deeper, atol=1e-2)
