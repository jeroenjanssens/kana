/**
 * Generates a seamless washi-paper texture on a canvas: fine grain, long translucent fibres and
 * a few soft cloudy patches. The sheets are used as CSS background images through blob: URLs.
 *
 * Not data: URLs. Every textured element resolves the custom property that holds the image, and
 * Chrome re-parses a data URL (about 500 KB each) for every one of them: on the Table, with 400
 * textured surfaces, that took a second (four on a phone) of style recalculation.
 */

import { hash, prng } from './random'

export interface WashiOptions {
  size?: number
  dark?: boolean
  seed?: number
  /** Number of fibres (default 220). */
  fibres?: number
  /** Number of cloudy patches (default 14). */
  patches?: number
  /** A faint overall tint. */
  tint?: 'warm' | 'cool'
}

/** Four sheets of paper with different character; surfaces pick one (see washiStyle). */
export const WASHI_VARIANTS: readonly WashiOptions[] = [
  { seed: 7 },
  { seed: 21, fibres: 320, patches: 8 },
  { seed: 42, fibres: 150, patches: 22, tint: 'warm' },
  { seed: 99, fibres: 260, patches: 12, tint: 'cool' },
]

/**
 * CSS variables that give a surface its own sheet: one of the textures, rotated by any angle and
 * offset. Deterministic for a seed, so a surface keeps its paper when it re-renders.
 */
export function washiStyle(seed: number | string): string {
  const rand = prng(typeof seed === 'string' ? hash(seed) : seed * 2654435761)
  const texture = Math.floor(rand() * WASHI_VARIANTS.length)
  const angle = Math.round(rand() * 360)
  const x = Math.round(rand() * 384)
  const y = Math.round(rand() * 384)
  return `--washi-tex: var(--washi-${texture}); --washi-angle: ${angle}deg; --washi-x: ${x}px; --washi-y: ${y}px`
}

/** Draws a sheet of paper, as a PNG (undefined without a canvas, e.g. in jsdom). */
export async function generateWashi(options: WashiOptions = {}): Promise<Blob | undefined> {
  const canvas = drawWashi(options)
  if (!canvas) return undefined
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/png')
    } catch {
      resolve(undefined)
    }
  })
}

/** Blob URLs of the sheets currently in use, per variant; revoked when a sheet is replaced. */
const installed = new Map<number, string>()

/**
 * Draws every paper variant for the theme, one per idle callback so it never blocks the page,
 * and sets them as `--washi-0`… on `root`. Returns a function that cancels the sheets that
 * haven't been drawn yet (the ones already shown stay until they are replaced).
 */
export function installWashi(
  root: HTMLElement,
  dark: boolean,
  {
    idle = globalThis.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 200)),
    generate = generateWashi,
  }: {
    idle?: (fn: () => Promise<void>) => unknown
    generate?: (options: WashiOptions) => Promise<Blob | undefined>
  } = {},
): () => void {
  let cancelled = false
  WASHI_VARIANTS.forEach((variant, i) =>
    idle(async () => {
      if (cancelled) return
      const blob = await generate({ ...variant, dark })
      if (cancelled) return
      const url = blob ? URL.createObjectURL(blob) : undefined
      root.style.setProperty(`--washi-${i}`, url ? `url(${url})` : 'none')
      const previous = installed.get(i)
      if (previous) URL.revokeObjectURL(previous)
      if (url) installed.set(i, url)
      else installed.delete(i)
    }),
  )
  return () => {
    cancelled = true
  }
}

function drawWashi(options: WashiOptions): HTMLCanvasElement | undefined {
  const size = options.size ?? 384
  const dark = options.dark ?? false
  const rand = prng(options.seed ?? 7)
  if (typeof document === 'undefined') return undefined
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  // Cloudy patches, drawn wrapped around the edges so the tile is seamless.
  const wrap = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy)
  }
  if (options.tint && !dark) {
    ctx.fillStyle = options.tint === 'warm' ? 'rgba(190,140,70,0.035)' : 'rgba(110,135,160,0.03)'
    ctx.fillRect(0, 0, size, size)
  }
  for (let i = 0; i < (options.patches ?? 14); i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 30 + rand() * 90
    const alpha = 0.025 + rand() * 0.035
    const c = dark ? '0,0,0' : rand() > 0.5 ? '120,95,60' : '255,255,255'
    wrap((dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      g.addColorStop(0, `rgba(${c},${alpha})`)
      g.addColorStop(1, `rgba(${c},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
    })
  }

  // Fibres: long, thin, slightly curved strands, some darker, some lighter than the paper.
  ctx.lineCap = 'round'
  for (let i = 0; i < (options.fibres ?? 220); i++) {
    const x = rand() * size
    const y = rand() * size
    const len = 20 + rand() * 90
    const angle = rand() * Math.PI * 2
    const bend = (rand() - 0.5) * len * 0.8
    const light = rand() > 0.55
    const alpha = light ? 0.18 + rand() * 0.2 : 0.035 + rand() * 0.06
    const color = light
      ? dark
        ? `rgba(255,245,225,${alpha * 0.35})`
        : `rgba(255,255,250,${alpha})`
      : dark
        ? `rgba(0,0,0,${alpha * 1.6})`
        : `rgba(110,85,50,${alpha})`
    const ex = Math.cos(angle) * len
    const ey = Math.sin(angle) * len
    const cx = ex / 2 - Math.sin(angle) * bend
    const cy = ey / 2 + Math.cos(angle) * bend
    ctx.strokeStyle = color
    ctx.lineWidth = 0.4 + rand() * 1.1
    wrap((dx, dy) => {
      ctx.beginPath()
      ctx.moveTo(x + dx, y + dy)
      ctx.quadraticCurveTo(x + dx + cx, y + dy + cy, x + dx + ex, y + dy + ey)
      ctx.stroke()
    })
  }

  // Fine grain.
  const image = ctx.getImageData(0, 0, size, size)
  const px = image.data
  for (let i = 0; i < px.length; i += 4) {
    const n = rand()
    if (n > 0.5) continue
    const v = dark ? 0 : n > 0.25 ? 255 : 90
    const a = Math.floor(n * 22)
    // Blend the grain over whatever is already there.
    const existing = px[i + 3]
    if (a > existing) {
      px[i] = v
      px[i + 1] = v - (dark ? 0 : 10)
      px[i + 2] = v - (dark ? 0 : 25)
      px[i + 3] = a
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}
