/**
 * Generates a seamless washi-paper texture on a canvas: fine grain, long translucent fibres and
 * a few soft cloudy patches. Returned as a data URL for use as a CSS background image.
 */

export interface WashiOptions {
  size?: number
  dark?: boolean
  seed?: number
}

/** Small deterministic PRNG (mulberry32) so the texture is stable between renders. */
export function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateWashi(options: WashiOptions = {}): string | undefined {
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
  for (let i = 0; i < 14; i++) {
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
  for (let i = 0; i < 220; i++) {
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

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return undefined
  }
}
