/** The main thread's side of the speech model: one worker, requests matched to answers. */
import type { KanaResult } from './recognize'

let worker: Worker | undefined
let nextId = 0
const pending = new Map<
  number,
  { resolve: (r: KanaResult | undefined) => void; reject: (e: Error) => void }
>()

function connect(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./speech.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent) => {
    const { id, ok, result, error } = event.data
    const p = pending.get(id)
    pending.delete(id)
    if (ok) p?.resolve(result)
    else p?.reject(new Error(error))
  }
  return worker
}

function ask(samples?: Float32Array, rate?: number): Promise<KanaResult | undefined> {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const base = new URL(import.meta.env.BASE_URL, location.href).href
    connect().postMessage({ id, base, samples, rate }, samples ? [samples.buffer] : [])
  })
}

/** Download the model (if needed) without recognising anything: resolves once it's ready. */
export async function prepareKanaModel(): Promise<void> {
  await ask()
}

/** Which kana sound a recording sounds like. */
export async function recognizeKana(samples: Float32Array, rate: number): Promise<KanaResult> {
  const result = await ask(samples, rate)
  if (!result) throw new Error('no result')
  return result
}
