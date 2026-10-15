/** Listen for one kana: record an utterance, then ask the model what it sounded like. */
import { captureUtterance, type CaptureOptions } from './capture'
import { prepareKanaModel, recognizeKana } from './client'
import type { KanaResult } from './recognize'

export type ListenErrorCode = 'denied' | 'microphone' | 'model'

export class ListenError extends Error {
  constructor(readonly code: ListenErrorCode) {
    super(`listening failed: ${code}`)
  }
}

let ready: Promise<void> | undefined

/** Download the model if needed (the first time only; then it's cached for offline use). */
export function ensureKanaModel(): Promise<void> {
  ready ??= prepareKanaModel().catch((err) => {
    ready = undefined
    throw err
  })
  return ready
}

export function listenForKana(options: CaptureOptions = {}): {
  result: Promise<KanaResult>
  stop: () => void
} {
  const capture = captureUtterance(options)
  const result = (async () => {
    try {
      await ensureKanaModel()
    } catch {
      capture.stop()
      throw new ListenError('model')
    }
    let utterance
    try {
      utterance = await capture.result
    } catch (err) {
      throw new ListenError(
        err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'microphone',
      )
    }
    return recognizeKana(utterance.samples, utterance.rate)
  })()
  return { result, stop: capture.stop }
}
