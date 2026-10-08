/**
 * Checks a hand-drawn kana against its KanjiVG strokes: stroke count, order, direction and
 * (leniently) shape. Pure functions, so they can be tested without a browser.
 */

export type Point = [number, number]

/** Sample an SVG path (the subset KanjiVG uses: M m C c S s L l Z z) into points. */
export function samplePath(d: string, perCurve = 16): Point[] {
  const tokens = d.match(/[MmCcSsLlZz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const points: Point[] = []
  let i = 0
  let command = ''
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let lastCtrl: Point | undefined
  const num = () => Number(tokens[i++])
  const cubic = (p1: Point, p2: Point, p3: Point) => {
    const p0: Point = [cx, cy]
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve
      const u = 1 - t
      points.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ])
    }
    lastCtrl = p2
    ;[cx, cy] = p3
  }
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) command = tokens[i++]
    const rel = command === command.toLowerCase()
    const ox = rel ? cx : 0
    const oy = rel ? cy : 0
    switch (command.toLowerCase()) {
      case 'm':
        cx = ox + num()
        cy = oy + num()
        startX = cx
        startY = cy
        points.push([cx, cy])
        lastCtrl = undefined
        command = rel ? 'l' : 'L' // further pairs are line-tos
        break
      case 'l':
        cx = ox + num()
        cy = oy + num()
        points.push([cx, cy])
        lastCtrl = undefined
        break
      case 'c': {
        const p1: Point = [ox + num(), oy + num()]
        const p2: Point = [ox + num(), oy + num()]
        const p3: Point = [ox + num(), oy + num()]
        cubic(p1, p2, p3)
        break
      }
      case 's': {
        const p1: Point = lastCtrl ? [2 * cx - lastCtrl[0], 2 * cy - lastCtrl[1]] : [cx, cy]
        const p2: Point = [ox + num(), oy + num()]
        const p3: Point = [ox + num(), oy + num()]
        cubic(p1, p2, p3)
        break
      }
      case 'z':
        cx = startX
        cy = startY
        points.push([cx, cy])
        break
      default:
        i++ // unknown token: skip
    }
  }
  return points
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function length(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  return total
}

/** Resample a polyline to `n` points evenly spaced along its length. */
export function resample(points: readonly Point[], n = 32): Point[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: n }, () => [...points[0]] as Point)
  const total = length(points)
  if (total === 0) return Array.from({ length: n }, () => [...points[0]] as Point)
  const step = total / (n - 1)
  const out: Point[] = [[...points[0]] as Point]
  let walked = 0
  let target = step
  for (let i = 1; i < points.length && out.length < n; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = dist(a, b)
    while (seg > 0 && walked + seg >= target && out.length < n) {
      const t = (target - walked) / seg
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      target += step
    }
    walked += seg
  }
  while (out.length < n) out.push([...points[points.length - 1]] as Point)
  return out
}

/** Move and scale a whole drawing so its bounding box is centred and its largest side is 1. */
export function normalize(strokes: readonly Point[][]): Point[][] {
  const all = strokes.flat()
  if (!all.length) return strokes.map((s) => [...s])
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(...xs) - minX
  const h = Math.max(...ys) - minY
  const size = Math.max(w, h) || 1
  const offX = (size - w) / 2
  const offY = (size - h) / 2
  return strokes.map((s) => s.map(([x, y]) => [(x - minX + offX) / size, (y - minY + offY) / size]))
}

/** Mean distance between two strokes resampled to the same number of points. */
function strokeDistance(a: readonly Point[], b: readonly Point[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i])
  return sum / a.length
}

export type StrokeIssue = 'shape' | 'direction' | 'order'

export interface StrokeCheck {
  index: number
  ok: boolean
  issue?: StrokeIssue
  /** Shape distance to the expected stroke (0 = identical; relative to the glyph size). */
  distance: number
}

export interface WritingResult {
  correct: boolean
  expected: number
  drawn: number
  /** Too few or too many strokes. */
  countIssue?: 'missing' | 'extra'
  strokes: StrokeCheck[]
}

/** How far (relative to the glyph size) a stroke may deviate and still count as the right shape. */
export const SHAPE_TOLERANCE = 0.2
/** Strokes shorter than this (relative) are dots: their direction isn't checked. */
const DOT_LENGTH = 0.12
const SAMPLES = 32

/**
 * Compare a drawing with the reference strokes (both as point lists in the same orientation).
 * Count, order and direction must be right; the shape only needs to be roughly right.
 */
export function checkWriting(
  drawn: readonly Point[][],
  reference: readonly Point[][],
  tolerance = SHAPE_TOLERANCE,
): WritingResult {
  const expected = reference.length
  const usable = drawn.filter((s) => s.length > 0)
  if (usable.length !== expected) {
    return {
      correct: false,
      expected,
      drawn: usable.length,
      countIssue: usable.length < expected ? 'missing' : 'extra',
      strokes: [],
    }
  }
  const user = normalize(usable).map((s) => resample(s, SAMPLES))
  const ref = normalize(reference).map((s) => resample(s, SAMPLES))
  const strokes: StrokeCheck[] = user.map((stroke, i) => {
    const forward = strokeDistance(stroke, ref[i])
    const backward = strokeDistance([...stroke].reverse(), ref[i])
    const isDot = length(ref[i]) < DOT_LENGTH
    // Order: does this stroke match another expected stroke much better than its own?
    const best = ref
      .map((r, j) => ({
        j,
        d: Math.min(strokeDistance(stroke, r), strokeDistance([...stroke].reverse(), r)),
      }))
      .sort((a, b) => a.d - b.d)[0]
    const own = Math.min(forward, backward)
    if (best.j !== i && best.d < tolerance && own > tolerance && best.d < own * 0.6) {
      return { index: i, ok: false, issue: 'order', distance: own }
    }
    if (own > tolerance) return { index: i, ok: false, issue: 'shape', distance: own }
    if (!isDot && backward < forward)
      return { index: i, ok: false, issue: 'direction', distance: forward }
    return { index: i, ok: true, distance: own }
  })
  return { correct: strokes.every((s) => s.ok), expected, drawn: usable.length, strokes }
}

/** Reference strokes for a kana from KanjiVG, laid out side by side for multi-character kana. */
export function referenceStrokes(glyphs: { strokes: string[]; x: number }[]): Point[][] {
  return glyphs.flatMap((g) =>
    g.strokes.map((d) => samplePath(d).map(([x, y]) => [x + g.x, y] as Point)),
  )
}

/** A suggested SRS grade: wrong → Again; right → by time (writing takes longer than reading). */
export function writingGrade(result: WritingResult, ms: number): 1 | 2 | 3 | 4 {
  if (!result.correct) return 1
  const close = result.strokes.every((s) => s.distance < SHAPE_TOLERANCE * 0.7)
  if (!close || ms > 20_000) return 2
  return ms <= 8000 ? 4 : 3
}

/** A short explanation of what went wrong, for the learner. */
export function describeResult(result: WritingResult): string {
  if (result.correct) return 'Correct!'
  if (result.countIssue === 'missing') {
    return `This kana has ${result.expected} strokes; you drew ${result.drawn}.`
  }
  if (result.countIssue === 'extra') {
    return `This kana has ${result.expected} stroke${result.expected === 1 ? '' : 's'}; you drew ${result.drawn}.`
  }
  const first = result.strokes.find((s) => !s.ok)!
  const n = first.index + 1
  if (first.issue === 'direction') return `Stroke ${n} goes the other way.`
  if (first.issue === 'order') return `Stroke ${n} comes later — check the order.`
  return `Stroke ${n} doesn't match the shape.`
}
