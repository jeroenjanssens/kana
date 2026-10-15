import { afterEach, describe, expect, test } from 'vitest'
import {
  SpeechError,
  heardKana,
  listen,
  normalizeHeard,
  speechErrorCode,
  speechRecognitionSupported,
  toHiragana,
} from '../../src/lib/audio/speech'

describe('matching what was heard', () => {
  test('katakana becomes hiragana; other characters stay', () => {
    expect(toHiragana('コーヒー')).toBe('こーひー')
    expect(toHiragana('ねこ猫')).toBe('ねこ猫')
  })

  test('spaces, punctuation and full-width forms are ignored', () => {
    expect(normalizeHeard(' す。')).toBe('す')
    expect(normalizeHeard('ネコ！')).toBe('ねこ')
    expect(normalizeHeard('ｽ')).toBe('す')
  })

  test('any guess in either script counts', () => {
    const heard = [
      { transcript: '酢', confidence: 0.8 },
      { transcript: 'ス', confidence: 0.4 },
    ]
    expect(heardKana(heard, 'す')).toBe(true)
    expect(heardKana(heard, 'つ')).toBe(false)
    expect(heardKana([{ transcript: 'コーヒー', confidence: 0 }], 'コーヒー')).toBe(true)
    expect(heardKana([], 'す')).toBe(false)
  })

  test('unknown error codes are "other"', () => {
    expect(speechErrorCode('network')).toBe('network')
    expect(speechErrorCode('bad-grammar')).toBe('other')
  })
})

/** A fake SpeechRecognition that plays back a script of events once started. */
class FakeRecognition {
  static last: FakeRecognition
  static script: (r: FakeRecognition) => void = () => {}
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = true
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    FakeRecognition.last = this
  }
  start() {
    queueMicrotask(() => FakeRecognition.script(this))
  }
  stop() {
    this.onend?.()
  }
  abort() {}
  result(...alternatives: string[]) {
    const list = Object.assign(
      alternatives.map((transcript, i) => ({ transcript, confidence: 0.9 - i / 10 })),
      { isFinal: true },
    )
    this.onresult?.({ results: [list] })
  }
}

function fakeRecognition(script: (r: FakeRecognition) => void) {
  FakeRecognition.script = script
  ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
    FakeRecognition
  return FakeRecognition
}

describe('listen', () => {
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })

  test('is unsupported without the API', () => {
    expect(speechRecognitionSupported()).toBe(false)
  })

  test('listens for Japanese and resolves with every guess, best first', async () => {
    const Fake = fakeRecognition((r) => {
      r.result('ね')
      r.result('猫', 'ねこ')
      r.onend?.()
    })
    expect(speechRecognitionSupported()).toBe(true)
    const updates: string[][] = []
    const { result } = listen((heard) => updates.push(heard.map((h) => h.transcript)))
    expect(await result).toEqual([
      { transcript: '猫', confidence: 0.9 },
      { transcript: 'ねこ', confidence: 0.8 },
    ])
    expect(updates).toEqual([['ね'], ['猫', 'ねこ']])
    expect(Fake.last).toMatchObject({ lang: 'ja-JP', maxAlternatives: 5, continuous: false })
  })

  test('rejects with the error code', async () => {
    fakeRecognition((r) => {
      r.onerror?.({ error: 'network' })
      r.onend?.()
    })
    const error = await listen().result.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SpeechError)
    expect((error as SpeechError).code).toBe('network')
  })
})
