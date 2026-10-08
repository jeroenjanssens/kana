import { describe, expect, test } from 'vitest'
import { grade, newRecord, dayKey } from '../../src/lib/srs/scheduler'
import type { ReviewEntry } from '../../src/lib/storage/schema'
import {
  confusions,
  dailyCounts,
  forecast,
  heatmap,
  masteryCounts,
  nextDayKey,
  performance,
  shiftDay,
  streak,
  totalAnswers,
  weakest,
} from '../../src/lib/study/stats'

const NOW = new Date(2026, 4, 20, 15).getTime()
const DAY = 86_400_000

const entry = (daysAgo: number, extra: Partial<ReviewEntry> = {}): ReviewEntry => ({
  t: NOW - daysAgo * DAY,
  mode: 'srs',
  deck: 'hiragana',
  id: 'a',
  correct: true,
  ms: 1500,
  ...extra,
})

describe('days', () => {
  test('shiftDay and nextDayKey', () => {
    expect(shiftDay(NOW, 0)).toBe('2026-05-20')
    expect(shiftDay(NOW, 1)).toBe('2026-05-19')
    expect(shiftDay(NOW, 20)).toBe('2026-04-30')
    expect(nextDayKey('2026-04-30')).toBe('2026-05-01')
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01')
  })

  test('dailyCounts', () => {
    const counts = dailyCounts([entry(0), entry(0), entry(1)])
    expect(counts.get('2026-05-20')).toBe(2)
    expect(counts.get('2026-05-19')).toBe(1)
  })
})

describe('streak', () => {
  test('no reviews', () => {
    expect(streak([], NOW)).toEqual({ current: 0, longest: 0, studiedToday: false })
  })
  test('counts consecutive days including today', () => {
    expect(streak([entry(0), entry(1), entry(2), entry(4)], NOW)).toEqual({
      current: 3,
      longest: 3,
      studiedToday: true,
    })
  })
  test('not having studied yet today does not break the streak', () => {
    expect(streak([entry(1), entry(2)], NOW).current).toBe(2)
  })
  test('a gap breaks the current streak but longest is kept', () => {
    const log = [entry(10), entry(11), entry(12), entry(13), entry(2)]
    expect(streak(log, NOW)).toEqual({ current: 0, longest: 4, studiedToday: false })
  })
})

describe('heatmap', () => {
  test('covers the requested weeks and ends today', () => {
    const days = heatmap([entry(0), entry(0), entry(3)], NOW, 4)
    expect(days).toHaveLength(28)
    expect(days.at(-1)).toMatchObject({ key: dayKey(NOW), count: 2, level: 4 })
    expect(days.at(-4)).toMatchObject({ count: 1, level: 2 })
    expect(days[0].level).toBe(0)
  })
})

describe('forecast', () => {
  test('buckets due cards by day, overdue counts for today', () => {
    const r = { ...grade(undefined, 4, NOW - 10 * DAY), state: 2 as const }
    const decks = {
      hiragana: {
        a: { ...r, due: NOW - DAY },
        i: { ...r, due: NOW + 2 * 3600_000 },
        u: { ...r, due: NOW + DAY },
        e: newRecord(NOW),
      },
      katakana: { a: { ...r, due: NOW + 3 * DAY } },
    }
    const f = forecast(decks, NOW, 7)
    expect(f).toHaveLength(7)
    expect(f[0]).toBe(2)
    expect(f[1]).toBe(1)
    expect(f[3]).toBe(1)
    expect(f.reduce((a, b) => a + b)).toBe(4)
  })
})

describe('masteryCounts', () => {
  test('counts each level', () => {
    const mature = { ...newRecord(NOW), state: 2 as const, scheduled_days: 30 }
    const counts = masteryCounts({ a: mature, i: grade(undefined, 1, NOW) }, ['a', 'i', 'u'])
    expect(counts).toEqual({ new: 1, learning: 1, young: 0, mature: 1 })
  })
})

describe('performance and weakest', () => {
  test('ranks kana with more mistakes as weaker', () => {
    const log = [
      entry(0, { id: 'a' }),
      entry(0, { id: 'a' }),
      entry(0, { id: 'i', correct: false }),
      entry(0, { id: 'i' }),
      entry(0, { id: 'u', correct: false }),
      entry(0, { id: 'u', correct: false }),
      entry(0, { id: 'o', mode: 'reading', deck: undefined }),
    ]
    const perf = performance(log, {}, NOW)
    expect(perf).toHaveLength(3)
    expect(perf.find((p) => p.id === 'i')).toMatchObject({ answers: 2, correct: 1, accuracy: 0.5 })
    expect(weakest(perf).map((p) => p.id)).toEqual(['u', 'i'])
  })

  test('average time ignores outliers', () => {
    const perf = performance(
      [entry(0, { ms: 1000 }), entry(0, { ms: 3000 }), entry(0, { ms: 90_000 })],
      {},
      NOW,
    )
    expect(perf[0].avgMs).toBe(2000)
  })
})

describe('confusions', () => {
  test('counts unordered pairs of mixed-up kana', () => {
    const log = [
      entry(0, { id: 'shi', correct: false, answer: 'tsu' }),
      entry(0, { id: 'tsu', correct: false, answer: 'shi' }),
      entry(0, { id: 'so', correct: false, answer: 'n' }),
      entry(0, { id: 'so', correct: false, answer: 'not-a-kana' }),
      entry(0, { id: 'so', correct: true, answer: 'so' }),
    ]
    expect(confusions(log)).toEqual([
      { shown: 'shi', answered: 'tsu', count: 2 },
      { shown: 'so', answered: 'n', count: 1 },
    ])
  })
})

test('totalAnswers', () => {
  expect(totalAnswers([entry(0), entry(0, { correct: false })])).toEqual({ total: 2, correct: 1 })
})
