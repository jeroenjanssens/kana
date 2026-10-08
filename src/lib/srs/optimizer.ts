import type { ReviewEntry } from '../storage/schema'
import { dayKey } from './queue'

/** Modes whose answers are real SRS reviews (graded and scheduled). */
const SCHEDULED = new Set(['srs', 'listen', 'write'])

/** FSRS needs about this many reviews before personalised weights beat the defaults. */
export const MIN_REVIEWS = 400

export interface TrainingData {
  /** Grades of all items, concatenated. */
  ratings: Uint32Array
  /** Days since the previous review (0 for the first), concatenated. */
  deltas: Uint32Array
  /** Length of each item. */
  lengths: Uint32Array
  reviews: number
  cards: number
}

function days(a: number, b: number): number {
  const [ya, ma, da] = dayKey(a).split('-').map(Number)
  const [yb, mb, db] = dayKey(b).split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/**
 * Turn the review log into FSRS training data: per card (deck + kana), its graded reviews in
 * order, and for every review after the first an item with the history up to and including it.
 */
export function trainingData(log: readonly ReviewEntry[]): TrainingData {
  const byCard = new Map<string, ReviewEntry[]>()
  for (const e of log) {
    if (!SCHEDULED.has(e.mode) || !e.deck || e.grade === undefined) continue
    const key = `${e.deck}:${e.id}`
    byCard.set(key, [...(byCard.get(key) ?? []), e])
  }
  const ratings: number[] = []
  const deltas: number[] = []
  const lengths: number[] = []
  let reviews = 0
  for (const entries of byCard.values()) {
    entries.sort((a, b) => a.t - b.t)
    reviews += entries.length
    const history = entries.map((e, i) => ({
      rating: e.grade!,
      delta: i === 0 ? 0 : days(entries[i - 1].t, e.t),
    }))
    for (let n = 2; n <= history.length; n++) {
      for (const h of history.slice(0, n)) {
        ratings.push(h.rating)
        deltas.push(h.delta)
      }
      lengths.push(n)
    }
  }
  return {
    ratings: Uint32Array.from(ratings),
    deltas: Uint32Array.from(deltas),
    lengths: Uint32Array.from(lengths),
    reviews,
    cards: byCard.size,
  }
}

export function scheduledReviews(log: readonly ReviewEntry[]): number {
  return log.filter((e) => SCHEDULED.has(e.mode) && e.grade !== undefined).length
}

/** Optimised weights must be a full, finite FSRS-6 parameter set. */
export function validWeights(w: readonly number[]): boolean {
  return w.length === 21 && w.every((x) => Number.isFinite(x))
}
