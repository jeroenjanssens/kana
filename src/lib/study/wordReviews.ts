import type { Word } from '../data/words'
import type { Lang } from '../i18n/format'
import { createScheduler, grade, retrievability } from '../srs/scheduler'
import type { Grade, ReviewEntry, SaveFile, WordProgress } from '../storage/schema'
import { normalize } from './answer'
import { wordMeaning } from './reading'
import type { WordSort } from './scripts'

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

/**
 * Undo for reading practice. Call `record` right before an answer changes the save file, and
 * `undo` to put the word, the log and the round back as they were.
 */
export class WordUndoStack {
  private steps: {
    kana: string
    progress: WordProgress | undefined
    logLength: number
    session: ReadingSnapshot
  }[] = []

  get size(): number {
    return this.steps.length
  }

  record(save: SaveFile, session: ReadingSession, kana: string): void {
    const p = save.words[kana]
    this.steps.push({
      kana,
      // Copied by hand: the save file may be reactive state, which structuredClone can't copy.
      progress: p ? { ...p, ...(p.card ? { card: { ...p.card } } : {}) } : undefined,
      logLength: save.log.length,
      session: session.snapshot(),
    })
  }

  /** Revert the last answer. Returns the word to show again, or undefined if there's nothing. */
  undo(save: SaveFile, session: ReadingSession): string | undefined {
    const step = this.steps.pop()
    if (!step) return undefined
    if (step.progress) save.words[step.kana] = step.progress
    else delete save.words[step.kana]
    save.log.splice(step.logLength)
    session.restore(step.session)
    return step.kana
  }

  clear(): void {
    this.steps = []
  }
}

/**
 * The word list sorted by a column. 'list' is the order of the word list (easiest first);
 * 'progress' is weakest first: new words, then by how likely you are to read them now, lowest
 * first; 'due' is soonest first. Words without a card go last for 'due', locked words always
 * go last for 'progress'. `desc` reverses the order (but not where those go).
 */
export function sortWords(
  list: readonly Word[],
  sort: WordSort,
  desc: boolean,
  save: SaveFile,
  options: { lang?: Lang; locked?: (w: Word) => boolean; now?: number } = {},
): Word[] {
  const { lang = 'en', locked = () => false, now = Date.now() } = options
  const card = (w: Word) => save.words[w.kana]?.card
  const sign = desc ? -1 : 1
  if (sort === 'kana' || sort === 'romaji' || sort === 'meaning') {
    const collator = new Intl.Collator(sort === 'kana' ? 'ja' : lang, { sensitivity: 'base' })
    const key = (w: Word) =>
      sort === 'kana' ? w.kana : sort === 'romaji' ? w.romaji : wordMeaning(w, lang)
    return [...list].sort((a, b) => sign * collator.compare(key(a), key(b)) || a.index - b.index)
  }
  if (sort === 'progress') {
    // New words are weakest: -1, below any chance of reading them.
    const score = (w: Word) => {
      const c = card(w)
      return !c || c.state === 0 ? -1 : (retrievability(c, now) ?? -1)
    }
    const scored = list.map((w) => ({ w, locked: locked(w), s: score(w) }))
    return scored
      .sort(
        (a, b) =>
          Number(a.locked) - Number(b.locked) || sign * (a.s - b.s) || a.w.index - b.w.index,
      )
      .map((x) => x.w)
  }
  if (sort === 'due') {
    const due = (w: Word) => {
      const c = card(w)
      return c && c.state !== 0 ? c.due : undefined
    }
    return [...list].sort((a, b) => {
      const da = due(a)
      const db = due(b)
      if (da === undefined || db === undefined) {
        return Number(da === undefined) - Number(db === undefined) || a.index - b.index
      }
      return sign * (da - db) || a.index - b.index
    })
  }
  return desc ? [...list].reverse() : [...list]
}

/** Whether a word matches a search, by its kana, romaji (macrons optional) or meaning. */
export function matchesSearch(word: Word, query: string, lang: Lang = 'en'): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (word.kana.includes(q.replace(/\s+/g, ''))) return true
  const romaji = normalize(q)
  if (
    romaji &&
    (normalize(word.romaji).includes(romaji) || word.accept.some((a) => a.includes(romaji)))
  ) {
    return true
  }
  return [wordMeaning(word, lang), word.meaning].some((m) => m.toLowerCase().includes(q))
}
