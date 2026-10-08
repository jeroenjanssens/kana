import { KANA, type Kana, type KanaGroup } from '../data/kana'
import type { CardRecord, DeckId } from '../storage/schema'

/**
 * Queues, sessions, days and mastery levels: everything about scheduling that doesn't need the
 * FSRS algorithm itself, so pages like Home can use it without loading ts-fsrs.
 */

/** FSRS card states (see ts-fsrs State). */
const NEW = 0
const LEARNING = 1
const RELEARNING = 3

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** New days start at 4 am local time, like Anki, so late-night sessions count for "today". */
export const DAY_ROLLOVER_HOUR = 4

/** Learning cards due within this window may be shown early when nothing else is left. */
export const LEARN_AHEAD_MS = 20 * MINUTE

/** Reviewed cards with an interval of at least this many days count as "mature". */
export const MATURE_DAYS = 21

export function dayKey(now: Date | number = Date.now()): string {
  const d = new Date(typeof now === 'number' ? now : now.getTime())
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Compact interval label: '<1m', '10m', '3h', '4d', '2mo', '1.5y'. */
const UNITS = {
  en: { m: 'm', h: 'h', d: 'd', mo: 'mo', y: 'y' },
  nl: { m: 'm', h: 'u', d: 'd', mo: 'mnd', y: 'j' },
} as const

export function formatInterval(ms: number, lang: 'en' | 'nl' = 'en'): string {
  const u = UNITS[lang]
  if (ms < MINUTE) return `<1${u.m}`
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}${u.m}`
  if (ms < DAY) return `${Math.round(ms / HOUR)}${u.h}`
  const days = ms / DAY
  if (days < 30) return `${Math.round(days)}${u.d}`
  if (days < 365) return `${Math.round(days / 30)}${u.mo}`
  const years = days / 365
  const n = years < 10 ? Math.round(years * 10) / 10 : Math.round(years)
  return `${lang === 'nl' ? String(n).replace('.', ',') : n}${u.y}`
}

export type MasteryLevel = 'new' | 'learning' | 'young' | 'mature'

export function masteryLevel(record: CardRecord | undefined): MasteryLevel {
  if (!record || record.state === NEW) return 'new'
  if (record.state === LEARNING || record.state === RELEARNING) return 'learning'
  return record.scheduled_days >= MATURE_DAYS ? 'mature' : 'young'
}

export const MASTERY_ORDER: readonly MasteryLevel[] = ['new', 'learning', 'young', 'mature']

export function atLeast(level: MasteryLevel, min: MasteryLevel): boolean {
  return MASTERY_ORDER.indexOf(level) >= MASTERY_ORDER.indexOf(min)
}

/** Kana that belong in a deck, given the enabled groups, in learning order. */
export function deckKana(deck: DeckId, groups: readonly KanaGroup[]): Kana[] {
  return KANA.filter((k) => {
    if (!groups.includes(k.group)) return false
    switch (deck) {
      case 'hiragana':
      case 'combined':
      case 'listen-hiragana':
        return k.hiragana !== ''
      case 'katakana':
      case 'listen-katakana':
        return true
      // Writing practice leaves out the extended katakana (ファ, ティ…).
      case 'write-hiragana':
        return k.hiragana !== ''
      case 'write-katakana':
        return k.group !== 'extended'
    }
  })
}

export interface QueueInput {
  cards: Record<string, CardRecord>
  kana: readonly Kana[]
  now: number
  newLimit: number
  reviewLimit: number
  /** New cards already introduced today in this deck. */
  newShownToday: number
  /** Reviews already done today in this deck. */
  reviewedToday?: number
}

export interface Queue {
  /** Learning/relearning cards due now (or within the learn-ahead window), earliest first. */
  learning: string[]
  /** Review cards due today, most overdue first. */
  review: string[]
  /** New cards to introduce, in learning order. */
  fresh: string[]
}

export function buildQueue(input: QueueInput): Queue {
  const { cards, kana, now } = input
  const endOfDay = startOfNextDay(now)
  const learning: { id: string; due: number }[] = []
  const review: { id: string; due: number }[] = []
  const fresh: string[] = []

  for (const k of kana) {
    const card = cards[k.id]
    if (!card || card.state === NEW) {
      fresh.push(k.id)
    } else if (card.state === LEARNING || card.state === RELEARNING) {
      if (card.due <= now + LEARN_AHEAD_MS) learning.push({ id: k.id, due: card.due })
    } else if (card.due < endOfDay) {
      review.push({ id: k.id, due: card.due })
    }
  }

  learning.sort((a, b) => a.due - b.due)
  review.sort((a, b) => a.due - b.due)
  const reviewRoom = Math.max(0, input.reviewLimit - (input.reviewedToday ?? 0))
  const newRoom = Math.max(0, input.newLimit - input.newShownToday)
  return {
    learning: learning.map((c) => c.id),
    review: review.slice(0, reviewRoom).map((c) => c.id),
    fresh: fresh.slice(0, newRoom),
  }
}

export function queueSize(q: Queue): number {
  return q.learning.length + q.review.length + q.fresh.length
}

export function startOfNextDay(now: number): number {
  const d = new Date(now)
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
  d.setHours(24 + DAY_ROLLOVER_HOUR, 0, 0, 0)
  return d.getTime()
}

export interface SessionSnapshot {
  reviews: string[]
  fresh: string[]
  pending: { id: string; due: number }[]
  sinceNew: number
  seen: string[]
  done: number
}

/**
 * A study session over a queue. Reviews and new cards are interleaved (one new card after every
 * few reviews), and cards that come back in learning are shown again once they're due.
 */
export class Session {
  private reviews: string[]
  private fresh: string[]
  private pending: { id: string; due: number }[] = []
  private sinceNew = 0
  private seen = new Set<string>()
  readonly total: number
  done = 0

  constructor(
    queue: Queue,
    private readonly newEvery = 3,
  ) {
    this.reviews = [...queue.review]
    this.fresh = [...queue.fresh]
    // Learning cards are already due; show them first.
    this.pending = queue.learning.map((id, i) => ({ id, due: -1 + i * 1e-6 }))
    this.total = queueSize(queue)
  }

  /** Remaining cards, including ones waiting in learning. */
  get remaining(): number {
    return this.reviews.length + this.fresh.length + this.pending.length
  }

  /** Cards answered at least once this session; drives the progress bar. */
  get seenCount(): number {
    return this.seen.size
  }

  /** Cards not answered yet this session. */
  get unseen(): number {
    return this.total - this.seen.size
  }

  /** Cards answered already that will come back because they're still being learned. */
  get repeating(): number {
    return this.pending.filter((p) => this.seen.has(p.id)).length
  }

  /** Share of the session's cards seen at least once, from 0 to 1. */
  get progress(): number {
    return this.total ? this.seen.size / this.total : 1
  }

  isNew(id: string): boolean {
    return this.fresh.includes(id)
  }

  /** The next card to show, or undefined when the session is finished. */
  next(now: number = Date.now()): string | undefined {
    this.pending.sort((a, b) => a.due - b.due)
    const due = this.pending[0]
    if (due && due.due <= now) return due.id

    const wantNew =
      this.fresh.length > 0 && (this.sinceNew >= this.newEvery || !this.reviews.length)
    if (wantNew) return this.fresh[0]
    if (this.reviews.length) return this.reviews[0]
    // Nothing else left: learn ahead rather than making the learner wait.
    return due?.id
  }

  /** Record the result of answering `id`; `record` is the card after grading. */
  answer(id: string, record: CardRecord, now: number = Date.now()): void {
    this.pending = this.pending.filter((p) => p.id !== id)
    if (this.fresh[0] === id) {
      this.fresh.shift()
      this.sinceNew = 0
    } else {
      // Only reviews count towards the "one new card every few reviews" rhythm.
      const i = this.reviews.indexOf(id)
      if (i >= 0) {
        this.reviews.splice(i, 1)
        this.sinceNew++
      }
    }
    this.done++
    this.seen.add(id)
    const inLearning = record.state === LEARNING || record.state === RELEARNING
    if (inLearning && record.due < startOfNextDay(now)) {
      this.pending.push({ id, due: record.due })
    }
  }

  /** A copy of the session's internal state, for undo. */
  snapshot(): SessionSnapshot {
    return {
      reviews: [...this.reviews],
      fresh: [...this.fresh],
      pending: this.pending.map((p) => ({ ...p })),
      sinceNew: this.sinceNew,
      seen: [...this.seen],
      done: this.done,
    }
  }

  restore(s: SessionSnapshot): void {
    this.reviews = [...s.reviews]
    this.fresh = [...s.fresh]
    this.pending = s.pending.map((p) => ({ ...p }))
    this.sinceNew = s.sinceNew
    this.seen = new Set(s.seen)
    this.done = s.done
  }

  /** Time until the next learning card is due, when only learning cards remain. */
  waitMs(now: number = Date.now()): number {
    if (this.reviews.length || this.fresh.length || !this.pending.length) return 0
    return Math.max(0, Math.min(...this.pending.map((p) => p.due)) - now)
  }
}
