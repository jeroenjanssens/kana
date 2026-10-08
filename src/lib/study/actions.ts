import { dayKey, grade as gradeCard, masteryLevel, type MasteryLevel } from '../srs/scheduler'
import type { CardRecord, DeckId, Grade, Mode, ReviewEntry, SaveFile } from '../storage/schema'

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
    if (dayKey(e.t) !== today) break
    if (e.deck === deck && e.grade !== undefined && !e.new) n++
  }
  return n
}

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
  const cards = (save.cards[input.deck] ??= {})
  const before = cards[input.id]
  const wasNew = !before || before.state === 0
  const after = gradeCard(before, input.grade, now)
  cards[input.id] = after

  if (wasNew) save.daily.newShown[input.deck] = (save.daily.newShown[input.deck] ?? 0) + 1

  const levelBefore = masteryLevel(before)
  const levelAfter = masteryLevel(after)
  const celebrated = (save.celebrated[input.deck] ??= [])
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

/** Log a practice answer that doesn't affect scheduling (in-order, drills, reading). */
export function logPractice(save: SaveFile, entry: Omit<ReviewEntry, 't'> & { t?: number }): void {
  save.log.push({ ...entry, t: entry.t ?? Date.now(), ms: Math.round(entry.ms) })
}

export function recordWord(save: SaveFile, word: string, correct: boolean, now = Date.now()) {
  const p = (save.words[word] ??= { seen: 0, correct: 0, last: 0 })
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
  save.celebrated = {}
}
