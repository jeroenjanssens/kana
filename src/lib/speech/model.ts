/**
 * The kana speech network, run in plain TypeScript: the same arithmetic as
 * ml/kana_speech/reference.py, on the int8 weights written by ml/kana_speech/export.py.
 */
import { FRAMES, N_MELS } from './features'

export interface ModelMeta {
  version: string
  /** Class ids: sound romaji ('su', 'kya'…), and '_' for "no kana" last. */
  classes: string[]
  temperature: number
  network: {
    classes: number
    channels: number
    blocks: number
    /** 2 halves the frames in the first convolution; 1 keeps 10 ms steps. */
    time_stride?: number
    /** 'meanmax' pools with the maximum as well as the mean. */
    pool?: 'mean' | 'meanmax'
    tensors: { name: string; type: 'int8' | 'float32'; shape: number[]; offset: number }[]
  }
  metrics?: Record<string, number | boolean>
}

interface Layer {
  w: Float32Array
  b: Float32Array
}

export interface Network {
  meta: ModelMeta
  conv: Layer
  blocks: { dw: Layer; pw: Layer }[]
  fc: Layer
}

/** Turn the exported file into float weights (int8 × per-channel scale). */
export function parseNetwork(meta: ModelMeta, bin: ArrayBuffer): Network {
  const byName = new Map(meta.network.tensors.map((t) => [t.name, t]))
  const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1)
  const floats = (name: string) => {
    const t = byName.get(name)
    if (!t || t.type !== 'float32') throw new Error(`missing float tensor ${name}`)
    return new Float32Array(bin.slice(t.offset, t.offset + 4 * size(t.shape)))
  }
  const layer = (name: string): Layer => {
    const t = byName.get(`${name}.w`)
    if (!t || t.type !== 'int8') throw new Error(`missing weights ${name}`)
    const q = new Int8Array(bin, t.offset, size(t.shape))
    const scale = floats(`${name}.scale`)
    const per = q.length / t.shape[0]
    const w = new Float32Array(q.length)
    for (let i = 0; i < q.length; i++) w[i] = q[i] * scale[Math.floor(i / per)]
    return { w, b: floats(`${name}.b`) }
  }
  return {
    meta,
    conv: layer('conv'),
    blocks: Array.from({ length: meta.network.blocks }, (_, i) => ({
      dw: layer(`blocks.${i}.dw`),
      pw: layer(`blocks.${i}.pw`),
    })),
    fc: layer('fc'),
  }
}

/** A feature map: channels × height × width. */
interface Map3 {
  c: number
  h: number
  w: number
  data: Float32Array
}

/** The first convolution: 1 → C channels, 10×4 kernel, stride (s×2), padding; with ReLU. */
function firstConv(spec: Float32Array, layer: Layer, c: number, s: number): Map3 {
  const [kh, kw, sh, sw, ph, pw] = [10, 4, s, 2, s === 2 ? 4 : 5, 1]
  const h = Math.floor((FRAMES + 2 * ph - kh) / sh) + 1
  const w = Math.floor((N_MELS + 2 * pw - kw) / sw) + 1
  const out = new Float32Array(c * h * w)
  for (let o = 0; o < c; o++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = layer.b[o]
        for (let i = 0; i < kh; i++) {
          const sy = y * sh + i - ph
          if (sy < 0 || sy >= FRAMES) continue
          for (let j = 0; j < kw; j++) {
            const sx = x * sw + j - pw
            if (sx < 0 || sx >= N_MELS) continue
            sum += layer.w[(o * kh + i) * kw + j] * spec[sy * N_MELS + sx]
          }
        }
        out[(o * h + y) * w + x] = sum > 0 ? sum : 0
      }
    }
  }
  return { c, h, w, data: out }
}

/** Depthwise 3×3 convolution with padding 1; with ReLU. */
function depthwise(x: Map3, layer: Layer, stride: number): Map3 {
  const h = Math.floor((x.h + 2 - 3) / stride) + 1
  const w = Math.floor((x.w + 2 - 3) / stride) + 1
  const out = new Float32Array(x.c * h * w)
  for (let c = 0; c < x.c; c++) {
    const base = c * x.h * x.w
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        let sum = layer.b[c]
        for (let i = 0; i < 3; i++) {
          const sy = y * stride + i - 1
          if (sy < 0 || sy >= x.h) continue
          for (let j = 0; j < 3; j++) {
            const sx = xx * stride + j - 1
            if (sx < 0 || sx >= x.w) continue
            sum += layer.w[c * 9 + i * 3 + j] * x.data[base + sy * x.w + sx]
          }
        }
        out[(c * h + y) * w + xx] = sum > 0 ? sum : 0
      }
    }
  }
  return { c: x.c, h, w, data: out }
}

/** Pointwise (1×1) convolution, C → C; with ReLU. */
function pointwise(x: Map3, layer: Layer): Map3 {
  const n = x.h * x.w
  const out = new Float32Array(x.c * n)
  for (let o = 0; o < x.c; o++) {
    const row = out.subarray(o * n, (o + 1) * n)
    row.fill(layer.b[o])
    for (let c = 0; c < x.c; c++) {
      const k = layer.w[o * x.c + c]
      if (k === 0) continue
      const src = x.data.subarray(c * n, (c + 1) * n)
      for (let p = 0; p < n; p++) row[p] += k * src[p]
    }
    for (let p = 0; p < n; p++) if (row[p] < 0) row[p] = 0
  }
  return { ...x, data: out }
}

/** Logits for one spectrogram (FRAMES × N_MELS). */
export function forward(net: Network, spec: Float32Array): Float32Array {
  const c = net.meta.network.channels
  let x = firstConv(spec, net.conv, c, net.meta.network.time_stride ?? 2)
  net.blocks.forEach((blk, i) => {
    x = pointwise(depthwise(x, blk.dw, i === 0 ? 2 : 1), blk.pw)
  })
  const n = x.h * x.w
  const max = net.meta.network.pool === 'meanmax'
  const pooled = new Float32Array(max ? 2 * c : c)
  for (let ch = 0; ch < c; ch++) {
    let sum = 0
    let top = -Infinity
    for (let p = 0; p < n; p++) {
      const v = x.data[ch * n + p]
      sum += v
      if (v > top) top = v
    }
    pooled[ch] = sum / n
    if (max) pooled[c + ch] = top
  }
  const classes = net.meta.network.classes
  const width = pooled.length
  const logits = new Float32Array(classes)
  for (let k = 0; k < classes; k++) {
    let sum = net.fc.b[k]
    for (let i = 0; i < width; i++) sum += net.fc.w[k * width + i] * pooled[i]
    logits[k] = sum
  }
  return logits
}

/** Calibrated probabilities. */
export function softmax(logits: Float32Array, temperature = 1): Float32Array {
  let max = -Infinity
  for (const v of logits) max = Math.max(max, v / temperature)
  const e = Float32Array.from(logits, (v) => Math.exp(v / temperature - max))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}
