import { createScheduler, grade } from '../srs/scheduler'
import type { Grade, ReviewEntry, SaveFile } from '../storage/schema'

/** The grade of a reading answer: answers from before there were grades were right or wrong. */
export function readingGrade(e: Pick<ReviewEntry, 'correct' | 'grade'>): Grade {
  return e.grade ?? (e.correct ? 3 : 1)
}

/**
 * Give words their FSRS card from the answers that came before it: reading practice used to have
 * two answers, now read as Good (read it) and Again (couldn't read it). Each word's answers in the
 * log since its card was last reviewed (all of them, for a word without a card) are replayed in
 * order. A word with progress but no answers left in the log gets one answer at its last practice.
 * Without fuzz, so every device that does this gets the same cards. Returns how many words changed.
 */
export function migrateWordCards(save: SaveFile): number {
  const scheduler = createScheduler({
    fuzz: false,
    weights: save.settings.fsrsWeights,
    retention: save.settings.retention,
  })
  const pending = new Map<string, ReviewEntry[]>()
  for (const e of save.log) {
    if (e.mode !== 'reading' || e.grade !== undefined) continue
    const card = save.words[e.id]?.card
    if (card && e.t <= (card.last_review ?? 0)) continue
    const list = pending.get(e.id)
    if (list) list.push(e)
    else pending.set(e.id, [e])
  }
  let changed = 0
  for (const [word, p] of Object.entries(save.words)) {
    const entries = pending.get(word)?.sort((a, b) => a.t - b.t)
    if (entries) {
      let card = p.card
      for (const e of entries) card = grade(card, readingGrade(e), e.t, scheduler)
      p.card = card
      changed++
    } else if (!p.card && p.seen > 0) {
      const mostlyRight = p.correct * 2 >= p.seen
      p.card = grade(undefined, mostlyRight ? 3 : 1, p.last || save.createdAt, scheduler)
      changed++
    }
  }
  return changed
}
