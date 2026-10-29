import type { Word } from '../data/words'
import { createScheduler, grade, retrievability } from '../srs/scheduler'
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

/** A word you answered Again comes back after this many other answers (or sooner, see next). */
export const AGAIN_GAP = [3, 5] as const
/** At most one new word for every this many due ones, while there are due words. */
const DUE_PER_NEW = 2

interface Again {
  kana: string
  /** The number of answers after which it's back. */
  at: number
}

export interface ReadingSnapshot {
  answered: number
  again: Again[]
  shown: string[]
  last: string | undefined
  dueSinceNew: number
}

/**
 * The order of a round of reading practice. Next is, in this order: a word you answered Again in
 * this round (after a few others); a due word, most overdue first, with a new word (shortest
 * first) after every two; a word answered Again that isn't back yet; and practising ahead, words
 * not shown in this round first, least likely to be remembered first. Never the same word twice
 * in a row, unless it's the only one. Grading is done by the caller (recordWord); the cards are
 * read from the save file.
 */
export class ReadingSession {
  private answered = 0
  private again: Again[] = []
  private shown = new Set<string>()
  private last: string | undefined
  private dueSinceNew = 0

  constructor(
    private readonly pool: readonly Word[],
    private readonly save: SaveFile,
    /** Answers in the round; 0 for no limit. */
    readonly limit: number,
    private readonly rand: () => number = Math.random,
  ) {}

  get count(): number {
    return this.answered
  }

  get done(): boolean {
    return this.limit > 0 && this.answered >= this.limit
  }

  next(now: number = Date.now()): Word | undefined {
    if (this.done || !this.pool.length) return undefined
    const word = this.pick(now)
    this.last = word.kana
    this.shown.add(word.kana)
    return word
  }

  answer(word: Word, rating: Grade): void {
    this.answered++
    this.again = this.again.filter((a) => a.kana !== word.kana)
    if (rating === 1) {
      const [min, max] = AGAIN_GAP
      const gap = min + Math.floor(this.rand() * (max - min + 1))
      this.again.push({ kana: word.kana, at: this.answered + gap })
    }
  }

  snapshot(): ReadingSnapshot {
    return {
      answered: this.answered,
      again: this.again.map((a) => ({ ...a })),
      shown: [...this.shown],
      last: this.last,
      dueSinceNew: this.dueSinceNew,
    }
  }

  restore(s: ReadingSnapshot): void {
    this.answered = s.answered
    this.again = s.again.map((a) => ({ ...a }))
    this.shown = new Set(s.shown)
    this.last = s.last
    this.dueSinceNew = s.dueSinceNew
  }

  private pick(now: number): Word {
    const byKana = new Map(this.pool.map((w) => [w.kana, w]))
    const others = this.pool.filter((w) => w.kana !== this.last)
    if (!others.length) return this.pool[0]
    const waiting = new Set(this.again.map((a) => a.kana))
    const again = this.again
      .filter((a) => a.kana !== this.last && byKana.has(a.kana))
      .sort((a, b) => a.at - b.at)

    const back = again.find((a) => a.at <= this.answered)
    if (back) return byKana.get(back.kana)!

    const free = others.filter((w) => !waiting.has(w.kana))
    const card = (w: Word) => this.save.words[w.kana]?.card
    const recall = (w: Word) => retrievability(card(w), now) ?? 0
    const isNew = (w: Word) => !card(w) || card(w)!.state === 0
    const due = free
      .filter((w) => !isNew(w) && card(w)!.due <= now)
      .map((w) => ({ w, r: recall(w), due: card(w)!.due }))
      .sort((a, b) => a.r - b.r || a.due - b.due)
      .map((x) => x.w)
    const fresh = free
      .filter((w) => isNew(w) && !this.shown.has(w.kana))
      .sort((a, b) => [...a.kana].length - [...b.kana].length || a.index - b.index)

    if (fresh.length && (!due.length || this.dueSinceNew >= DUE_PER_NEW)) {
      this.dueSinceNew = 0
      return fresh[0]
    }
    if (due.length) {
      this.dueSinceNew++
      return due[0]
    }
    if (again.length) return byKana.get(again[0].kana)!

    const ahead = free.length ? free : others
    return ahead
      .map((w) => ({ w, seen: this.shown.has(w.kana) ? 1 : 0, r: recall(w) }))
      .sort((a, b) => a.seen - b.seen || a.r - b.r)[0].w
  }
}
