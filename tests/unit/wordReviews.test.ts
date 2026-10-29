import { describe, expect, test } from 'vitest'
import { createScheduler, grade } from '../../src/lib/srs/scheduler'
import { emptySave, type ReviewEntry } from '../../src/lib/storage/schema'
import { recordWord } from '../../src/lib/study/actions'
import { migrateWordCards, readingGrade } from '../../src/lib/study/wordReviews'

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
