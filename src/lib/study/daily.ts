import { dayKey } from '../srs/queue'
import type { DeckId, SaveFile } from '../storage/schema'

/** Reset the per-day counters when a new day has started. */
export function ensureDay(save: SaveFile, now: number = Date.now()): void {
  const day = dayKey(now)
  if (save.daily.day !== day) save.daily = { day, newShown: {} }
}

/** New cards introduced today in a deck. Pure: safe to call from derived state. */
export function newShownToday(save: SaveFile, deck: DeckId, now: number = Date.now()): number {
  return save.daily.day === dayKey(now) ? (save.daily.newShown[deck] ?? 0) : 0
}

/** SRS reviews of previously-seen cards done today in a deck. */
export function reviewedToday(save: SaveFile, deck: DeckId, now: number = Date.now()): number {
  const today = dayKey(now)
  let n = 0
  for (let i = save.log.length - 1; i >= 0; i--) {
    const e = save.log[i]
    const day = dayKey(e.t)
    // Entries from a later day (synced from a device whose clock is ahead) are skipped; the log is
    // in time order, so the first earlier day ends today's entries.
    if (day > today) continue
    if (day < today) break
    if (e.deck === deck && e.grade !== undefined && !e.new) n++
  }
  return n
}
