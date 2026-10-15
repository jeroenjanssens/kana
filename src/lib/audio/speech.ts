/**
 * Speech recognition through the browser (Web Speech API), for saying kana and words out loud.
 * Safari recognises speech with Apple's service, Chrome with Google's; browsers built on Chrome's
 * engine (Vivaldi, Brave…) have the API but no service, and fail with a 'network' error.
 */

/** One guess of what was said. Safari often reports a confidence of 0 (unknown). */
export interface Heard {
  transcript: string
  confidence: number
}

export type SpeechErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'network'
  | 'no-speech'
  | 'audio-capture'
  | 'language-not-supported'
  | 'aborted'
  | 'other'

/** The parts of SpeechRecognition used here (not in every TypeScript DOM library yet). */
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>
}

type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function speechRecognitionSupported(): boolean {
  return recognitionConstructor() !== undefined
}

const ERROR_CODES: readonly SpeechErrorCode[] = [
  'not-allowed',
  'service-not-allowed',
  'network',
  'no-speech',
  'audio-capture',
  'language-not-supported',
  'aborted',
]

export function speechErrorCode(error: string): SpeechErrorCode {
  return (ERROR_CODES as readonly string[]).includes(error) ? (error as SpeechErrorCode) : 'other'
}

/**
 * Listen for one utterance in Japanese. `onHeard` gets the guesses so far (best first), and is
 * called again as they improve; the promise resolves with the final guesses when listening ends.
 */
export function listen(onHeard: (heard: Heard[]) => void = () => {}): {
  result: Promise<Heard[]>
  stop: () => void
} {
  const Ctor = recognitionConstructor()
  if (!Ctor) return { result: Promise.reject(new SpeechError('other')), stop: () => {} }
  const r = new Ctor()
  r.lang = 'ja-JP'
  r.interimResults = true
  r.maxAlternatives = 5
  r.continuous = false
  let heard: Heard[] = []
  let failed: SpeechError | undefined
  const result = new Promise<Heard[]>((resolve, reject) => {
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1]
      heard = Array.from(last, (a) => ({ transcript: a.transcript, confidence: a.confidence }))
      onHeard(heard)
    }
    r.onerror = (e) => {
      failed = new SpeechError(speechErrorCode(e.error))
    }
    r.onend = () => {
      if (failed && !(failed.code === 'aborted' && heard.length)) reject(failed)
      else resolve(heard)
    }
  })
  r.start()
  return { result, stop: () => r.stop() }
}

export class SpeechError extends Error {
  constructor(readonly code: SpeechErrorCode) {
    super(`Speech recognition failed: ${code}`)
  }
}

/** Katakana to hiragana (ー and other characters are kept). */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** What was heard, made comparable: no spaces or punctuation, and in hiragana. */
export function normalizeHeard(text: string): string {
  return toHiragana(text.normalize('NFKC').replace(/[\s。、．，,.！!？?「」『』・〜~]/g, ''))
}

/** Whether any of the guesses is `kana` (in either script). */
export function heardKana(heard: readonly Heard[], kana: string): boolean {
  const target = normalizeHeard(kana)
  return heard.some((h) => normalizeHeard(h.transcript) === target)
}
