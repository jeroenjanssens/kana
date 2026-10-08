import { masteryLevel, type MasteryLevel } from '../srs/queue'
import { grade as gradeCard } from '../srs/scheduler'
import { ensureDay } from './daily'

export { ensureDay, newShownToday, reviewedToday } from './daily'
import type { CardRecord, DeckId, Grade, Mode, ReviewEntry, SaveFile } from '../storage/schema'

export interface ReviewInput {
  deck: DeckId
  id: string
  grade: Grade
  ms: number
  mode?: Mode
  /** Whether the answer was right; defaults to grade > 1. */
  correct?: boolean
  /** What the learner typed or picked (kana id), for the confusion stats. */
  answer?: string
  now?: number
}

export interface ReviewResult {
  before?: CardRecord
  after: CardRecord
  wasNew: boolean
  levelBefore: MasteryLevel
  levelAfter: MasteryLevel
  /** True the first time a card reaches "mature" in this deck. */
  becameMature: boolean
}

/** Grade a card in an SRS deck, update the daily counters and the review log. */
export function recordReview(save: SaveFile, input: ReviewInput): ReviewResult {
  const now = input.now ?? Date.now()
  ensureDay(save, now)
  // Always read containers back from `save` after creating them: when `save` is reactive state,
  // only the stored value is the tracked proxy, and changes to the original object would be lost.
  save.cards[input.deck] ??= {}
  const cards = save.cards[input.deck]!
  const before = cards[input.id]
  const wasNew = !before || before.state === 0
  const after = gradeCard(before, input.grade, now)
  cards[input.id] = after

  if (wasNew) save.daily.newShown[input.deck] = (save.daily.newShown[input.deck] ?? 0) + 1

  const levelBefore = masteryLevel(before)
  const levelAfter = masteryLevel(after)
  save.celebrated[input.deck] ??= []
  const celebrated = save.celebrated[input.deck]!
  const becameMature = levelAfter === 'mature' && !celebrated.includes(input.id)
  if (becameMature) celebrated.push(input.id)

  save.log.push({
    t: now,
    mode: input.mode ?? 'srs',
    deck: input.deck,
    id: input.id,
    correct: input.correct ?? input.grade > 1,
    grade: input.grade,
    ms: Math.round(input.ms),
    ...(input.answer !== undefined ? { answer: input.answer } : {}),
    ...(wasNew ? { new: true } : {}),
  })

  return { before, after, wasNew, levelBefore, levelAfter, becameMature }
}

/**
 * Introduce a new kana: it goes into learning, due in a minute, so it's quizzed shortly. It
 * counts as a new card for today, and is logged as an introduction (not as a right or wrong answer).
 */
export function introduce(
  save: SaveFile,
  input: { deck: DeckId; id: string; ms?: number; now?: number },
): CardRecord {
  const now = input.now ?? Date.now()
  ensureDay(save, now)
  save.cards[input.deck] ??= {}
  const cards = save.cards[input.deck]!
  const card = gradeCard(cards[input.id], 1, now)
  cards[input.id] = card
  save.daily.newShown[input.deck] = (save.daily.newShown[input.deck] ?? 0) + 1
  save.log.push({
    t: now,
    mode: 'intro',
    deck: input.deck,
    id: input.id,
    correct: true,
    ms: Math.round(input.ms ?? 0),
    new: true,
  })
  return card
}

/** Log a practice answer that doesn't affect scheduling (in-order, drills, reading). */
export function logPractice(save: SaveFile, entry: Omit<ReviewEntry, 't'> & { t?: number }): void {
  save.log.push({ ...entry, t: entry.t ?? Date.now(), ms: Math.round(entry.ms) })
}

export function recordWord(save: SaveFile, word: string, correct: boolean, now = Date.now()) {
  save.words[word] ??= { seen: 0, correct: 0, last: 0 }
  const p = save.words[word]
  p.seen++
  if (correct) p.correct++
  p.last = now
}

export function markNoteSeen(save: SaveFile, note: string): boolean {
  if (save.seenNotes.includes(note)) return false
  save.seenNotes.push(note)
  return true
}

export function resetProgress(save: SaveFile): void {
  save.cards = {}
  save.words = {}
  save.log = []
  save.daily = { day: '', newShown: {} }
  save.seenNotes = []
  save.sprints = {}
  save.celebrated = {}
}
