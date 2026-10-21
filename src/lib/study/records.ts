import type { RaceResult, SprintResult } from '../storage/schema'

/**
 * Sprint and race records, kept apart from the sprint and race pages so that loading and merging
 * saves (part of the first load) doesn't pull those pages in.
 */

/** Results kept per script choice and length. */
const KEEP = 50

export function sprintMinutes(result: SprintResult): number {
  return result.minutes ?? 1
}

/** Keep the most recent results of each length, so a rarely run length keeps its record. */
export function trimSprints(list: readonly SprintResult[]): SprintResult[] {
  const kept = new Map<number, number>()
  const out: SprintResult[] = []
  for (let i = list.length - 1; i >= 0; i--) {
    const minutes = sprintMinutes(list[i])
    const n = kept.get(minutes) ?? 0
    if (n >= KEEP) continue
    kept.set(minutes, n + 1)
    out.push(list[i])
  }
  return out.reverse()
}

/** The faster of two race results (the earlier one on a tie). */
export function fasterRace(a: RaceResult, b: RaceResult): RaceResult {
  return a.ms !== b.ms ? (a.ms < b.ms ? a : b) : a.at <= b.at ? a : b
}
