/**
 * Log-mel spectrograms: what the speech model hears. The same maths as ml/kana_speech/features.py
 * (the NumPy reference), checked against its golden files in tests/fixtures/speech.
 */

export const SAMPLE_RATE = 16_000
/** The model hears one second. */
export const WINDOW = SAMPLE_RATE
const FRAME = 400 // 25 ms
const HOP = 160 // 10 ms
const N_FFT = 512
export const N_MELS = 40
const F_MIN = 60
const F_MAX = 7600
const EPS = 1e-6
export const FRAMES = 1 + Math.floor((WINDOW - FRAME) / HOP) // 98
const BINS = N_FFT / 2 + 1

const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700)
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1)

/** Triangular mel filters, [N_MELS][BINS], HTK mel scale, peak 1 (rounded to float32). */
function melFilters(): Float32Array[] {
  const lo = hzToMel(F_MIN)
  const hi = hzToMel(F_MAX)
  const edges = Array.from({ length: N_MELS + 2 }, (_, i) =>
    melToHz(lo + ((hi - lo) * i) / (N_MELS + 1)),
  )
  return Array.from({ length: N_MELS }, (_, m) => {
    const row = new Float32Array(BINS)
    const [a, b, c] = [edges[m], edges[m + 1], edges[m + 2]]
    for (let k = 0; k < BINS; k++) {
      const f = (k * SAMPLE_RATE) / N_FFT
      row[k] = Math.max(0, Math.min((f - a) / (b - a), (c - f) / (c - b)))
    }
    return row
  })
}

/** Periodic Hann window (rounded to float32, as in NumPy). */
function hann(): Float32Array {
  return Float32Array.from(
    { length: FRAME },
    (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / FRAME),
  )
}

/** In-place iterative radix-2 FFT of `re`/`im` (length N_FFT). */
function fft(re: Float64Array, im: Float64Array, cos: Float64Array, sin: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1
    const step = n / size
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step]
        const wi = -sin[k * step]
        const a = start + k
        const b = a + half
        const tr = re[b] * wr - im[b] * wi
        const ti = re[b] * wi + im[b] * wr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
}

let tables: { filters: Float32Array[]; window: Float32Array; cos: Float64Array; sin: Float64Array }

/**
 * The normalised log-mel spectrogram of one second of 16 kHz audio in [-1, 1]: FRAMES × N_MELS
 * values, frame by frame.
 */
export function logmel(audio: Float32Array): Float32Array {
  if (audio.length !== WINDOW) throw new Error(`expected ${WINDOW} samples, got ${audio.length}`)
  tables ??= {
    filters: melFilters(),
    window: hann(),
    cos: Float64Array.from({ length: N_FFT / 2 }, (_, k) => Math.cos((2 * Math.PI * k) / N_FFT)),
    sin: Float64Array.from({ length: N_FFT / 2 }, (_, k) => Math.sin((2 * Math.PI * k) / N_FFT)),
  }
  const { filters, window, cos, sin } = tables
  const spec = new Float64Array(FRAMES * N_MELS)
  const re = new Float64Array(N_FFT)
  const im = new Float64Array(N_FFT)
  const power = new Float64Array(BINS)
  for (let t = 0; t < FRAMES; t++) {
    re.fill(0)
    im.fill(0)
    // Windowing in float32, as NumPy does for float32 audio.
    for (let i = 0; i < FRAME; i++) re[i] = Math.fround(audio[t * HOP + i] * window[i])
    fft(re, im, cos, sin)
    for (let k = 0; k < BINS; k++) power[k] = re[k] * re[k] + im[k] * im[k]
    for (let m = 0; m < N_MELS; m++) {
      const f = filters[m]
      let sum = 0
      for (let k = 0; k < BINS; k++) sum += power[k] * f[k]
      spec[t * N_MELS + m] = Math.log(sum + EPS)
    }
  }
  let mean = 0
  for (const v of spec) mean += v
  mean /= spec.length
  let variance = 0
  for (const v of spec) variance += (v - mean) ** 2
  const std = Math.sqrt(variance / spec.length)
  return Float32Array.from(spec, (v) => (v - mean) / (std + 1e-5))
}
