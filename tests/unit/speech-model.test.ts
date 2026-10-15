// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { findSpeech, frameEnergy, resample, speechWindow } from '../../src/lib/speech/audio'
import { NO_KANA, SOUND_CLASSES, soundOf } from '../../src/lib/speech/classes'
import { FRAMES, N_MELS, WINDOW, logmel } from '../../src/lib/speech/features'
import { forward, parseNetwork, softmax, type ModelMeta } from '../../src/lib/speech/model'
import { kanaById } from '../../src/lib/data/kana'
import { prng } from '../../src/lib/ui/random'

/** Golden values from the Python reference (ml/kana_speech/fixtures.py). */
const fixture = JSON.parse(readFileSync('tests/fixtures/speech/parity.json', 'utf8')) as {
  pcm16: string
  features: number[][]
  meta: ModelMeta
  bin: string
  logits: number[]
}

function bytes(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

const audio = Float32Array.from(new Int16Array(bytes(fixture.pcm16)), (v) => v / 32767)
const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Array.from(a).reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0)

describe('features match the Python reference', () => {
  test('log-mel spectrogram', () => {
    const spec = logmel(audio)
    expect(spec.length).toBe(FRAMES * N_MELS)
    expect(maxDiff(spec, fixture.features.flat())).toBeLessThan(1e-4)
  })

  test('wrong length is refused', () => {
    expect(() => logmel(new Float32Array(100))).toThrow()
  })
})

describe.each(['parity', 'parity-fine'])('network %s matches the Python reference', (name) => {
  const f = JSON.parse(readFileSync(`tests/fixtures/speech/${name}.json`, 'utf8')) as typeof fixture
  const net = parseNetwork(f.meta, bytes(f.bin))

  test('logits from the reference features', () => {
    const logits = forward(net, Float32Array.from(f.features.flat()))
    expect(maxDiff(logits, f.logits)).toBeLessThan(1e-4)
  })

  test('the whole way from audio', () => {
    const logits = forward(net, logmel(audio))
    expect(maxDiff(logits, f.logits)).toBeLessThan(1e-3)
  })
})

test('calibrated probabilities', () => {
  const p = softmax(Float32Array.from(fixture.logits), 1.5)
  expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
  const sharp = softmax(Float32Array.from(fixture.logits), 0.5)
  expect(Math.max(...sharp)).toBeGreaterThan(Math.max(...p))
})

describe('preparing audio', () => {
  const tone = (rate: number, hz: number, seconds: number) =>
    Float32Array.from(
      { length: rate * seconds },
      (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate),
    )

  test('resampling to 16 kHz keeps a tone and its level', () => {
    const out = resample(tone(48_000, 1000, 1), 48_000)
    expect(out.length).toBe(16_000)
    const crossings = out.slice(100, -100).filter((v, i, a) => i > 0 && a[i - 1] < 0 && v >= 0)
    expect(crossings.length).toBeGreaterThan(985)
    expect(crossings.length).toBeLessThan(1000)
    const rms = Math.sqrt(out.slice(100, -100).reduce((s, v) => s + v * v, 0) / (out.length - 200))
    expect(rms).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  test("resampling removes what 16 kHz can't hold", () => {
    const out = resample(tone(48_000, 11_000, 1), 48_000)
    const rms = Math.sqrt(out.slice(100, -100).reduce((s, v) => s + v * v, 0) / (out.length - 200))
    expect(rms).toBeLessThan(0.02)
  })

  test('finding the speech in a quiet recording', () => {
    const rec = new Float32Array(32_000).map(() => (Math.random() - 0.5) * 0.002)
    for (let i = 12_000; i < 18_000; i++) rec[i] += 0.3 * Math.sin(i / 3)
    const speech = findSpeech(rec)!
    expect(speech.start).toBeGreaterThan(11_000)
    expect(speech.start).toBeLessThanOrEqual(12_000)
    expect(speech.end).toBeGreaterThanOrEqual(18_000)
    expect(speech.end).toBeLessThan(19_000)
    // The speech ends up in the middle of the one-second window.
    const energy = frameEnergy(speechWindow(rec))
    const loud = [...energy].map((e, f) => (e > 0.01 ? f : -1)).filter((f) => f >= 0)
    expect((loud[0] + loud.at(-1)!) / 2).toBeGreaterThan(45)
    expect((loud[0] + loud.at(-1)!) / 2).toBeLessThan(55)
    expect(speechWindow(rec).length).toBe(WINDOW)
  })

  test('silence has no speech', () => {
    expect(findSpeech(new Float32Array(16_000))).toBeUndefined()
    const hiss = new Float32Array(16_000).map(() => (Math.random() - 0.5) * 0.002)
    expect(findSpeech(hiss)).toBeUndefined()
  })
})

describe('sound classes', () => {
  test('one per sound: kana that sound the same share one', () => {
    expect(SOUND_CLASSES).toHaveLength(101)
    expect(SOUND_CLASSES.find((c) => c.id === 'o')!.kana).toEqual(['o', 'wo'])
    expect(SOUND_CLASSES.find((c) => c.id === 'ji')!.kana).toEqual(['ji', 'di'])
    expect(soundOf(kanaById('wo'))).toBe('o')
    expect(soundOf(kanaById('x-fa'))).toBeUndefined()
    expect(NO_KANA).toBe('_')
  })

  test('ml/classes.json is up to date (just ml-classes)', () => {
    const json = JSON.parse(readFileSync('ml/classes.json', 'utf8'))
    expect(json.classes.map((c: { id: string }) => c.id)).toEqual(SOUND_CLASSES.map((c) => c.id))
  })
})

test('the credits list exactly the voices the model is trained on', () => {
  const credits = JSON.parse(readFileSync('public/models/credits.json', 'utf8')) as {
    character: string
    credit: string
  }[]
  const voices = JSON.parse(readFileSync('ml/voices.json', 'utf8')) as { character: string }[]
  expect(new Set(credits.map((v) => v.character))).toEqual(new Set(voices.map((v) => v.character)))
  for (const v of credits) expect(v.credit).toBe(`VOICEVOX:${v.character}`)
})

describe('the shipped model', () => {
  const meta = JSON.parse(readFileSync('public/models/kana-speech-v1.json', 'utf8')) as ModelMeta
  const bin = readFileSync('public/models/kana-speech-v1.bin')
  const net = parseNetwork(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength))

  test("knows exactly the app's sounds", () => {
    expect(meta.classes).toEqual([...SOUND_CLASSES.map((c) => c.id), NO_KANA])
  })

  test('hears "no kana" in near-silence', () => {
    // Faint white noise, as from a microphone in a quiet room (seeded, so it's always the same).
    const rand = prng(1)
    const hiss = Float32Array.from({ length: WINDOW }, () => (rand() - 0.5) * 0.001)
    const p = softmax(forward(net, logmel(hiss)), meta.temperature)
    expect(meta.classes[p.indexOf(Math.max(...p))]).toBe(NO_KANA)
  })
})
