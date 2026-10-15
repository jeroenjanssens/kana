/// <reference lib="webworker" />
/**
 * Runs the kana speech model off the main thread. The model is downloaded on the first request
 * (and then cached by the service worker, so it works offline).
 */
import type { Network } from './model'
import { loadNetwork, recognize } from './recognize'

interface Request {
  id: number
  base: string
  samples?: Float32Array
  rate?: number
}

let net: Promise<Network> | undefined

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, base, samples, rate } = event.data
  try {
    net ??= loadNetwork(base)
    const loaded = await net
    const result = samples && rate ? recognize(loaded, samples, rate) : undefined
    self.postMessage({ id, ok: true, result, version: loaded.meta.version })
  } catch (err) {
    net = undefined
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
