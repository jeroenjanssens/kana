/**
 * Record one utterance from the microphone as raw samples: it stops by itself shortly after you
 * stop speaking (or after `maxMs`). Echo cancellation, noise suppression and automatic gain are
 * switched off: they change the sound the model hears.
 */

export interface Utterance {
  samples: Float32Array
  rate: number
}

export interface CaptureOptions {
  /** Give up after this long, speech or not. */
  maxMs?: number
  /** Stop this long after the speech ends. */
  trailingMs?: number
  /** Called about 60 times a second with the input level, 0–1, for a meter. */
  onLevel?: (level: number) => void
}

/** The worklet just hands every block of samples to the main thread. */
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) this.port.postMessage(ch.slice(0))
    return true
  }
}
registerProcessor('kana-tap', Tap)
`

export function captureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioWorkletNode !== 'undefined'
  )
}

/**
 * Listen for one utterance. Resolves with everything recorded; `stop()` ends it early (e.g. a
 * tap on the button). The microphone is released as soon as it's done.
 */
export function captureUtterance(options: CaptureOptions = {}): {
  result: Promise<Utterance>
  stop: () => void
} {
  const { maxMs = 4000, trailingMs = 450, onLevel } = options
  let stopNow: () => void = () => {}
  const result = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    })
    const ctx = new AudioContext()
    try {
      await ctx.resume()
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
      await ctx.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)
      const source = ctx.createMediaStreamSource(stream)
      const tap = new AudioWorkletNode(ctx, 'kana-tap')
      source.connect(tap)
      const chunks: Float32Array[] = []
      const rate = ctx.sampleRate
      await new Promise<void>((done) => {
        let finished = false
        const finish = () => {
          if (finished) return
          finished = true
          clearTimeout(timer)
          done()
        }
        stopNow = finish
        const timer = setTimeout(finish, maxMs)
        // Endpointing on 10 ms energy: background from the first 150 ms, speech when clearly above
        // it, done after `trailingMs` of quiet following speech.
        const frame = Math.round(rate / 100)
        let pendingSamples: number[] = []
        let floor = Infinity
        let frames = 0
        let spoke = false
        let quiet = 0
        tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
          chunks.push(e.data)
          for (const v of e.data) pendingSamples.push(v)
          while (pendingSamples.length >= frame) {
            let sum = 0
            for (let i = 0; i < frame; i++) sum += pendingSamples[i] ** 2
            pendingSamples = pendingSamples.slice(frame)
            const energy = sum / frame
            frames++
            onLevel?.(Math.min(1, Math.sqrt(energy) * 8))
            if (frames <= 15) {
              floor = Math.min(floor, Math.max(energy, 1e-8))
              continue
            }
            const loud = energy > Math.max(floor * 30, 2e-6)
            if (loud) {
              spoke = true
              quiet = 0
            } else if (spoke && ++quiet * 10 >= trailingMs) {
              finish()
            }
          }
        }
      })
      tap.port.onmessage = null
      source.disconnect()
      const samples = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
      let offset = 0
      for (const c of chunks) {
        samples.set(c, offset)
        offset += c.length
      }
      return { samples, rate }
    } finally {
      for (const track of stream.getTracks()) track.stop()
      void ctx.close()
    }
  })()
  return { result, stop: () => stopNow() }
}
