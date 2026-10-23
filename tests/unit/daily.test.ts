import { expect, test } from 'vitest'
import { emptySave, type ReviewEntry } from '../../src/lib/storage/schema'
import { ensureDay, newShownToday, reviewedToday } from '../../src/lib/study/daily'

const HOUR = 3_600_000
// 10:00 local time; the day rolls over at 4:00.
const NOW = new Date(2026, 9, 23, 10).getTime()

const review = (t: number, extra: Partial<ReviewEntry> = {}): ReviewEntry => ({
  t,
  mode: 'srs',
  deck: 'hiragana',
  id: 'a',
  correct: true,
  grade: 3,
  ms: 900,
  ...extra,
})

test('a new day resets the counters, the same day keeps them', () => {
  const s = emptySave()
  ensureDay(s, NOW)
  s.daily.newShown.hiragana = 3
  ensureDay(s, NOW + HOUR)
  expect(newShownToday(s, 'hiragana', NOW + HOUR)).toBe(3)
  // 3:00 the next night is still the same study day; 5:00 is not.
  ensureDay(s, NOW + 17 * HOUR)
  expect(newShownToday(s, 'hiragana', NOW + 17 * HOUR)).toBe(3)
  ensureDay(s, NOW + 19 * HOUR)
  expect(s.daily.newShown).toEqual({})
})

test('counts reviews of seen cards in the deck, today only', () => {
  const s = emptySave()
  s.log.push(
    review(NOW - 8 * HOUR), // 2:00: yesterday's study day
    review(NOW - 5 * HOUR),
    review(NOW - 4 * HOUR, { new: true }),
    review(NOW - 3 * HOUR, { deck: 'katakana' }),
    review(NOW - 2 * HOUR, { grade: undefined, mode: 'listen' }),
    review(NOW - HOUR),
  )
  expect(reviewedToday(s, 'hiragana', NOW)).toBe(2)
})

test("entries from a device whose clock is ahead don't hide today's reviews", () => {
  const s = emptySave()
  s.log.push(review(NOW - 2 * HOUR), review(NOW - HOUR), review(NOW + 30 * HOUR))
  expect(reviewedToday(s, 'hiragana', NOW)).toBe(2)
})
