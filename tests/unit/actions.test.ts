import { describe, expect, test } from 'vitest'
import {
  ensureDay,
  logPractice,
  markNoteSeen,
  newShownToday,
  recordReview,
  recordWord,
  resetProgress,
  reviewedToday,
} from '../../src/lib/study/actions'
import { emptySave } from '../../src/lib/storage/schema'

const NOW = new Date(2026, 5, 1, 12).getTime()
const DAY = 86_400_000

describe('daily counters', () => {
  test('ensureDay resets counters on a new day', () => {
    const s = emptySave()
    ensureDay(s, NOW)
    s.daily.newShown.hiragana = 5
    ensureDay(s, NOW + 1000)
    expect(s.daily.newShown.hiragana).toBe(5)
    ensureDay(s, NOW + DAY)
    expect(s.daily.newShown).toEqual({})
  })

  test('new cards are counted per deck', () => {
    const s = emptySave()
    recordReview(s, { deck: 'hiragana', id: 'a', grade: 3, ms: 1000, now: NOW })
    recordReview(s, { deck: 'hiragana', id: 'i', grade: 3, ms: 1000, now: NOW })
    recordReview(s, { deck: 'katakana', id: 'a', grade: 3, ms: 1000, now: NOW })
    expect(newShownToday(s, 'hiragana', NOW)).toBe(2)
    expect(newShownToday(s, 'katakana', NOW)).toBe(1)
    expect(newShownToday(s, 'hiragana', NOW + DAY)).toBe(0)
  })

  test('reviewing a learning card again does not count as new', () => {
    const s = emptySave()
    recordReview(s, { deck: 'hiragana', id: 'a', grade: 1, ms: 1000, now: NOW })
    recordReview(s, { deck: 'hiragana', id: 'a', grade: 3, ms: 1000, now: NOW + 60_000 })
    expect(newShownToday(s, 'hiragana', NOW)).toBe(1)
    expect(reviewedToday(s, 'hiragana', NOW)).toBe(1)
  })
})

describe('recordReview', () => {
  test('creates the card and logs the review', () => {
    const s = emptySave()
    const r = recordReview(s, { deck: 'combined', id: 'ka', grade: 4, ms: 1234.6, now: NOW })
    expect(r.wasNew).toBe(true)
    expect(r.levelBefore).toBe('new')
    expect(s.cards.combined?.ka).toEqual(r.after)
    expect(s.log).toEqual([
      {
        t: NOW,
        mode: 'srs',
        deck: 'combined',
        id: 'ka',
        correct: true,
        grade: 4,
        ms: 1235,
        new: true,
      },
    ])
  })

  test('Again is logged as incorrect, with the given answer', () => {
    const s = emptySave()
    recordReview(s, { deck: 'hiragana', id: 'shi', grade: 1, ms: 900, answer: 'tsu', now: NOW })
    expect(s.log[0]).toMatchObject({ correct: false, answer: 'tsu' })
  })

  test('detects a card becoming mature only once', () => {
    const s = emptySave()
    s.cards.hiragana = {
      a: {
        due: NOW,
        stability: 40,
        difficulty: 3,
        elapsed_days: 20,
        scheduled_days: 20,
        learning_steps: 0,
        reps: 6,
        lapses: 0,
        state: 2,
        last_review: NOW - 20 * DAY,
      },
    }
    const first = recordReview(s, { deck: 'hiragana', id: 'a', grade: 3, ms: 800, now: NOW })
    expect(first.levelAfter).toBe('mature')
    expect(first.becameMature).toBe(true)
    const later = s.cards.hiragana.a.due
    const second = recordReview(s, { deck: 'hiragana', id: 'a', grade: 3, ms: 800, now: later })
    expect(second.becameMature).toBe(false)
    expect(s.celebrated.hiragana).toEqual(['a'])
  })
})

describe('practice and words', () => {
  test('logPractice appends without touching cards', () => {
    const s = emptySave()
    logPractice(s, { mode: 'order', deck: 'hiragana', id: 'a', correct: true, ms: 500.4, t: NOW })
    expect(s.cards).toEqual({})
    expect(s.log[0]).toEqual({
      mode: 'order',
      deck: 'hiragana',
      id: 'a',
      correct: true,
      ms: 500,
      t: NOW,
    })
  })

  test('recordWord tracks seen and correct counts', () => {
    const s = emptySave()
    recordWord(s, 'ねこ', true, NOW)
    recordWord(s, 'ねこ', false, NOW + 1)
    expect(s.words['ねこ']).toEqual({ seen: 2, correct: 1, last: NOW + 1 })
  })

  test('markNoteSeen returns true only the first time', () => {
    const s = emptySave()
    expect(markNoteSeen(s, 'sokuon')).toBe(true)
    expect(markNoteSeen(s, 'sokuon')).toBe(false)
  })

  test('resetProgress keeps settings', () => {
    const s = emptySave()
    s.settings.theme = 'dark'
    recordReview(s, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: NOW })
    recordWord(s, 'あい', true)
    resetProgress(s)
    expect(s.cards).toEqual({})
    expect(s.log).toEqual([])
    expect(s.words).toEqual({})
    expect(s.settings.theme).toBe('dark')
  })
})
