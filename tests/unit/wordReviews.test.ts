import { describe, expect, test } from 'vitest'
import { createScheduler, grade } from '../../src/lib/srs/scheduler'
import type { Word } from '../../src/lib/data/words'
import {
  emptySave,
  type Grade,
  type ReviewEntry,
  type SaveFile,
} from '../../src/lib/storage/schema'
import { recordWord } from '../../src/lib/study/actions'
import {
  migrateWordCards,
  ReadingSession,
  readingGrade,
  WordUndoStack,
} from '../../src/lib/study/wordReviews'

const T = new Date(2026, 5, 1, 10).getTime()
const DAY = 86_400_000
const noFuzz = createScheduler({ fuzz: false })

const answer = (id: string, t: number, correct: boolean): ReviewEntry => ({
  t,
  mode: 'reading',
  id,
  correct,
  ms: 1000,
})

describe('readingGrade', () => {
  test('uses the grade, or reads right as Good and wrong as Again', () => {
    expect(readingGrade({ correct: true, grade: 4 })).toBe(4)
    expect(readingGrade({ correct: true })).toBe(3)
    expect(readingGrade({ correct: false })).toBe(1)
  })
})

describe('migrateWordCards', () => {
  test("replays a word's answers in order: right as Good, wrong as Again", () => {
    const s = emptySave()
    s.words['ねこ'] = { seen: 3, correct: 2, last: T + 2 * DAY }
    // Out of order in the log, as after a merge.
    s.log = [
      answer('ねこ', T + DAY, false),
      answer('ねこ', T, true),
      answer('ねこ', T + 2 * DAY, true),
    ]
    expect(migrateWordCards(s)).toBe(1)
    let expected = grade(undefined, 3, T, noFuzz)
    expected = grade(expected, 1, T + DAY, noFuzz)
    expected = grade(expected, 3, T + 2 * DAY, noFuzz)
    expect(s.words['ねこ'].card).toEqual(expected)
    // The Again counts: the card isn't what three Goods would give.
    const allGood = [T, T + DAY, T + 2 * DAY].reduce(
      (c, t) => grade(c, 3, t, noFuzz),
      undefined as ReturnType<typeof grade> | undefined,
    )
    expect(s.words['ねこ'].card).not.toEqual(allGood)
  })

  test('only words, not other practice', () => {
    const s = emptySave()
    s.words['ねこ'] = { seen: 1, correct: 1, last: T }
    s.log = [{ ...answer('ねこ', T, true), mode: 'order' }]
    migrateWordCards(s)
    // No reading answers left in the log: one Good at the last practice.
    expect(s.words['ねこ'].card).toEqual(grade(undefined, 3, T, noFuzz))
  })

  test('a word without answers in the log gets one, by how it mostly went', () => {
    const s = emptySave(T - DAY)
    s.words['ねこ'] = { seen: 4, correct: 1, last: T }
    s.words['いぬ'] = { seen: 2, correct: 1, last: 0 }
    migrateWordCards(s)
    expect(s.words['ねこ'].card).toEqual(grade(undefined, 1, T, noFuzz))
    expect(s.words['いぬ'].card).toEqual(grade(undefined, 3, T - DAY, noFuzz))
  })

  test('runs once: words with a card and no newer ungraded answers stay as they are', () => {
    const s = emptySave()
    s.words['ねこ'] = { seen: 1, correct: 1, last: T }
    s.log = [answer('ねこ', T, true)]
    migrateWordCards(s)
    const card = s.words['ねこ'].card
    expect(migrateWordCards(s)).toBe(0)
    expect(s.words['ねこ'].card).toBe(card)
  })

  test('graded answers are already in the card', () => {
    const s = emptySave()
    recordWord(s, 'ねこ', 4, T)
    s.log = [{ ...answer('ねこ', T, true), grade: 4 }]
    const card = s.words['ねこ'].card
    expect(migrateWordCards(s)).toBe(0)
    expect(s.words['ねこ'].card).toBe(card)
  })

  test('answers from an older copy after the card are added to it', () => {
    const s = emptySave()
    s.words['ねこ'] = { seen: 2, correct: 1, last: T + DAY }
    s.log = [answer('ねこ', T, true)]
    migrateWordCards(s)
    const first = s.words['ねこ'].card
    // Synced from a device that doesn't have grades yet.
    s.log.push(answer('ねこ', T + DAY, false))
    expect(migrateWordCards(s)).toBe(1)
    expect(s.words['ねこ'].card).toEqual(grade(first, 1, T + DAY, noFuzz))
  })

  test('is the same on every device', () => {
    const make = () => {
      const s = emptySave()
      s.words['ねこ'] = { seen: 2, correct: 2, last: T + 3 * DAY }
      s.log = [answer('ねこ', T, true), answer('ねこ', T + 3 * DAY, true)]
      migrateWordCards(s)
      return s.words['ねこ'].card
    }
    expect(make()).toEqual(make())
  })
})

describe('ReadingSession', () => {
  const word = (kana: string, index: number): Word => ({
    kana,
    romaji: kana,
    accept: [],
    meaning: '',
    script: 'hiragana',
    rules: [],
    index,
  })
  const pool = ['あい', 'あお', 'あか', 'あき', 'いえ', 'うえ', 'いか', 'いけ'].map(word)
  /** A card reviewed `days` ago, due `due` days from T (negative: overdue). */
  const reviewed = (s: SaveFile, kana: string, due: number, stability = 5) => {
    s.words[kana] = {
      seen: 1,
      correct: 1,
      last: T - DAY,
      card: {
        due: T + due * DAY,
        stability,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 3,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
        last_review: T - DAY,
      },
    }
  }
  /** Answer `n` words with the same grade; returns what was shown. */
  const run = (session: ReadingSession, s: SaveFile, n: number, rating: Grade = 3) => {
    const out: string[] = []
    for (let i = 0; i < n; i++) {
      const w = session.next(T)
      if (!w) break
      out.push(w.kana)
      recordWord(s, w.kana, rating, T)
      session.answer(w, rating)
    }
    return out
  }

  test('new words come shortest first, then in list order', () => {
    const s = emptySave()
    const long = word('あいうえお', 0)
    const session = new ReadingSession([long, ...pool.slice(0, 2)], s, 0)
    expect(run(session, s, 3)).toEqual(['あい', 'あお', 'あいうえお'])
  })

  test('due words come first, most overdue first, with a new word after every two', () => {
    const s = emptySave()
    reviewed(s, 'いか', -1)
    reviewed(s, 'いけ', -5)
    reviewed(s, 'うえ', -3)
    reviewed(s, 'いえ', 2) // not due
    const session = new ReadingSession(pool, s, 0)
    expect(run(session, s, 5)).toEqual(['いけ', 'うえ', 'あい', 'いか', 'あお'])
  })

  test('a word answered Again comes back after 3 to 5 others', () => {
    for (const r of [0, 0.5, 0.99]) {
      const s = emptySave()
      const session = new ReadingSession(pool, s, 0, () => r)
      const first = session.next(T)!
      recordWord(s, first.kana, 1, T)
      session.answer(first, 1)
      const after = run(session, s, 7)
      const gap = after.indexOf(first.kana)
      expect(gap).toBe(3 + Math.floor(r * 3))
    }
  })

  test('only Again brings a word back in the round', () => {
    const s = emptySave()
    const session = new ReadingSession(pool, s, 0)
    const shown = run(session, s, pool.length, 2)
    expect(new Set(shown).size).toBe(pool.length)
  })

  test('with nothing else left, a missed word comes back sooner', () => {
    const s = emptySave()
    const two = pool.slice(0, 2)
    const session = new ReadingSession(two, s, 0, () => 0.99)
    const a = session.next(T)!
    recordWord(s, a.kana, 1, T)
    session.answer(a, 1)
    const b = session.next(T)!
    recordWord(s, b.kana, 3, T)
    session.answer(b, 3)
    expect(session.next(T)!.kana).toBe(a.kana)
  })

  test('never the same word twice in a row, unless it is the only one', () => {
    const s = emptySave()
    const session = new ReadingSession(pool.slice(0, 2), s, 0)
    const shown = run(session, s, 10, 1)
    for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1])
    const alone = new ReadingSession(pool.slice(0, 1), s, 0)
    expect(run(alone, s, 3)).toEqual(['あい', 'あい', 'あい'])
  })

  test('a round never runs out: it practises ahead, unseen and least remembered first', () => {
    const s = emptySave()
    reviewed(s, 'あい', 5, 20)
    reviewed(s, 'あお', 5, 2)
    const session = new ReadingSession(pool.slice(0, 2), s, 0)
    expect(run(session, s, 4)).toEqual(['あお', 'あい', 'あお', 'あい'])
  })

  test('stops at the limit; 0 is no limit', () => {
    const s = emptySave()
    const round = new ReadingSession(pool.slice(0, 3), s, 5)
    expect(run(round, s, 20)).toHaveLength(5)
    expect(round.done).toBe(true)
    expect(round.next(T)).toBeUndefined()
    const endless = new ReadingSession(pool.slice(0, 3), emptySave(), 0)
    expect(run(endless, emptySave(), 100)).toHaveLength(100)
    expect(endless.done).toBe(false)
  })

  test('restores a snapshot (for undo)', () => {
    const s = emptySave()
    const session = new ReadingSession(pool, s, 0, () => 0)
    run(session, s, 2)
    const snap = session.snapshot()
    const before = structuredClone(s)
    const next = run(session, s, 1, 1)
    session.restore(snap)
    expect(session.count).toBe(2)
    Object.assign(s, before)
    expect(run(session, s, 1)).toEqual(next)
  })
})

describe('WordUndoStack', () => {
  const w: Word = {
    kana: 'ねこ',
    romaji: 'neko',
    accept: [],
    meaning: '',
    script: 'hiragana',
    rules: [],
    index: 0,
  }

  test('puts the word, the log and the round back as they were', () => {
    const s = emptySave()
    const session = new ReadingSession([w], s, 5)
    const undo = new WordUndoStack()
    recordWord(s, 'ねこ', 3, T)
    s.log.push({ ...answer('ねこ', T, true), grade: 3 })
    const before = structuredClone(s.words['ねこ'])
    session.next(T)
    undo.record(s, session, 'ねこ')
    recordWord(s, 'ねこ', 1, T + 1)
    s.log.push({ ...answer('ねこ', T + 1, false), grade: 1 })
    session.answer(w, 1)
    expect(undo.undo(s, session)).toBe('ねこ')
    expect(s.words['ねこ']).toEqual(before)
    expect(s.log).toHaveLength(1)
    expect(session.count).toBe(0)
    expect(undo.size).toBe(0)
  })

  test('a word answered for the first time goes back to not practised', () => {
    const s = emptySave()
    const session = new ReadingSession([w], s, 0)
    const undo = new WordUndoStack()
    undo.record(s, session, 'ねこ')
    recordWord(s, 'ねこ', 3, T)
    undo.undo(s, session)
    expect(s.words).toEqual({})
    expect(undo.undo(s, session)).toBeUndefined()
  })
})
