import { validWeights, type TrainingData } from './optimizer'

/** Train personalised FSRS weights in a Web Worker. Rejects if the browser can't run it. */
export function optimizeWeights(data: TrainingData, timeoutMs = 120_000): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('The optimiser took too long'))
    }, timeoutMs)
    worker.onmessage = (
      event: MessageEvent<{ ok: boolean; weights?: number[]; error?: string }>,
    ) => {
      clearTimeout(timer)
      worker.terminate()
      const { ok, weights, error } = event.data
      if (ok && weights && validWeights(weights)) resolve(weights)
      else reject(new Error(error ?? 'The optimiser returned no usable weights'))
    }
    worker.onerror = (event) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(event.message || 'This browser cannot run the optimiser'))
    }
    worker.postMessage({ ratings: data.ratings, deltas: data.deltas, lengths: data.lengths })
  })
}
