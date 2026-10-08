/// <reference lib="webworker" />
/**
 * Runs the FSRS optimizer (fsrs-rs compiled to WebAssembly) off the main thread. It's loaded only
 * when the learner asks for personalised intervals.
 */
import init, { Fsrs } from 'fsrs-browser'
import wasmUrl from 'fsrs-browser/fsrs_browser_bg.wasm?url'

interface Request {
  ratings: Uint32Array
  deltas: Uint32Array
  lengths: Uint32Array
}

self.onmessage = async (event: MessageEvent<Request>) => {
  try {
    await init({ module_or_path: wasmUrl })
    const { ratings, deltas, lengths } = event.data
    const weights = new Fsrs().computeParameters(ratings, deltas, lengths, undefined, true)
    self.postMessage({ ok: true, weights: Array.from(weights) })
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
