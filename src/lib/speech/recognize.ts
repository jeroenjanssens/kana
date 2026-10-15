/** From a recording to ranked guesses of which kana sound was said. */
import { resample, speechWindow, findSpeech } from './audio'
import { SAMPLE_RATE, logmel } from './features'
import { forward, parseNetwork, softmax, type ModelMeta, type Network } from './model'
import { NO_KANA, SOUND_CLASSES } from './classes'

/** The model shipped with the app, downloaded on first use. */
export const MODEL_VERSION = 'v1'

export interface Guess {
  /** A sound class id ('su', 'kya'), or NO_KANA. */
  sound: string
  /** Calibrated probability, 0–1. */
  p: number
}

export interface KanaResult {
  /** All classes, most likely first. */
  guesses: Guess[]
  /** Whether anything stood out from the background at all. */
  speech: boolean
}

export async function loadNetwork(base: string, version = MODEL_VERSION): Promise<Network> {
  const url = `${base}models/kana-speech-${version}`
  const [meta, bin] = await Promise.all([
    fetch(`${url}.json`).then((r) => {
      if (!r.ok) throw new Error(`model ${version}: ${r.status}`)
      return r.json() as Promise<ModelMeta>
    }),
    fetch(`${url}.bin`).then((r) => {
      if (!r.ok) throw new Error(`model ${version}: ${r.status}`)
      return r.arrayBuffer()
    }),
  ])
  const known = [...SOUND_CLASSES.map((c) => c.id), NO_KANA]
  if (meta.classes.join() !== known.join()) {
    throw new Error(`model ${version} was trained on other sounds than the app's`)
  }
  return parseNetwork(meta, bin)
}

/** Guesses for a recording at any sample rate. */
export function recognize(net: Network, samples: Float32Array, rate: number): KanaResult {
  const audio = resample(samples, rate)
  const speech = findSpeech(audio) !== undefined
  const probs = softmax(forward(net, logmel(speechWindow(audio))), net.meta.temperature)
  const guesses = net.meta.classes
    .map((sound, i) => ({ sound, p: probs[i] }))
    .sort((a, b) => b.p - a.p)
  return { guesses, speech }
}

export { SAMPLE_RATE }
