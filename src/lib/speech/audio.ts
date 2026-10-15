/** Preparing microphone audio for the speech model: 16 kHz, and one second around the speech. */
import { SAMPLE_RATE, WINDOW } from './features'

/**
 * Resample to 16 kHz with a windowed-sinc low-pass (Blackman window), so higher rates (44.1 and
 * 48 kHz on phones and laptops) don't fold their highs back into the band the model hears.
 */
export function resample(input: Float32Array, rate: number): Float32Array {
  if (rate === SAMPLE_RATE) return input.slice()
  const ratio = SAMPLE_RATE / rate
  const cutoff = Math.min(1, ratio) * 0.95
  const half = 16 // taps on each side, in input samples (scaled when downsampling)
  const reach = Math.ceil(half / Math.min(1, ratio))
  const out = new Float32Array(Math.floor(input.length * ratio))
  for (let i = 0; i < out.length; i++) {
    const centre = i / ratio
    const first = Math.max(0, Math.ceil(centre - reach))
    const last = Math.min(input.length - 1, Math.floor(centre + reach))
    let sum = 0
    let norm = 0
    for (let j = first; j <= last; j++) {
      const t = j - centre
      const x = t * cutoff
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
      const p = (t + reach) / (2 * reach)
      const blackman = 0.42 - 0.5 * Math.cos(2 * Math.PI * p) + 0.08 * Math.cos(4 * Math.PI * p)
      const k = sinc * blackman
      sum += input[j] * k
      norm += k
    }
    out[i] = norm ? sum / norm : 0
  }
  return out
}

const FRAME = 160 // 10 ms at 16 kHz

/** Loudness per 10 ms frame (mean square). */
export function frameEnergy(audio: Float32Array): Float32Array {
  const n = Math.floor(audio.length / FRAME)
  const out = new Float32Array(n)
  for (let f = 0; f < n; f++) {
    let sum = 0
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) sum += audio[i] * audio[i]
    out[f] = sum / FRAME
  }
  return out
}

/**
 * Where the speech is: from the first to the last frame clearly above the background (the
 * quietest tenth of the recording), in samples. Undefined when nothing stands out.
 */
export function findSpeech(audio: Float32Array): { start: number; end: number } | undefined {
  const energy = frameEnergy(audio)
  if (!energy.length) return undefined
  const sorted = [...energy].sort((a, b) => a - b)
  const floor = Math.max(sorted[Math.floor(sorted.length * 0.1)], 1e-9)
  const peak = sorted[sorted.length - 1]
  // Speech is well above the floor (×30, 15 dB) and not too far below the loudest moment.
  const threshold = Math.max(floor * 30, peak * 10 ** -4.5)
  if (peak < threshold || peak < 1e-7) return undefined
  let first = -1
  let last = -1
  energy.forEach((e, f) => {
    if (e > threshold) {
      if (first < 0) first = f
      last = f
    }
  })
  if (first < 0) return undefined
  // A little margin, as in the training clips (30 ms).
  return {
    start: Math.max(0, (first - 3) * FRAME),
    end: Math.min(audio.length, (last + 4) * FRAME),
  }
}

/**
 * One WINDOW of audio with the speech in the middle (as the model was tested); the background
 * fills the rest when there's enough of it, otherwise silence.
 */
export function speechWindow(audio: Float32Array): Float32Array {
  const speech = findSpeech(audio)
  const out = new Float32Array(WINDOW)
  if (!speech) {
    out.set(audio.subarray(0, WINDOW))
    return out
  }
  const length = Math.min(WINDOW, speech.end - speech.start)
  const centre = Math.floor((speech.start + speech.end) / 2)
  let from = centre - WINDOW / 2
  from = Math.max(0, Math.min(from, audio.length - WINDOW))
  if (audio.length >= WINDOW) {
    out.set(audio.subarray(from, from + WINDOW))
  } else {
    out.set(audio.subarray(speech.start, speech.start + length), Math.floor((WINDOW - length) / 2))
  }
  return out
}
