import { describe, expect, test } from 'vitest'
import { kanaInGroups } from '../../src/lib/data/kana'
import {
  LEARN_AHEAD_MS,
  MATURE_DAYS,
  Session,
  atLeast,
  buildQueue,
  createScheduler,
  dayKey,
  deckKana,
  formatInterval,
  fromCard,
  grade,
  masteryLevel,
  newRecord,
  previewIntervals,
  queueSize,
  retrievability,
  startOfNextDay,
  toCard,
} from '../../src/lib/srs/scheduler'
import type { CardRecord } from '../../src/lib/storage/schema'

const f = createScheduler({ fuzz: false })
const T0 = new Date(2026, 0, 10, 12, 0, 0).getTime()
const MIN = 60_000
const DAY = 86_400_000

describe('dayKey', () => {
  test('uses local date', () => {
    expect(dayKey(new Date(2026, 0, 10, 12))).toBe('2026-01-10')
  })
  test('rolls over at 4 am', () => {
    expect(dayKey(new Date(2026, 0, 10, 3, 59))).toBe('2026-01-09')
    expect(dayKey(new Date(2026, 0, 10, 4, 0))).toBe('2026-01-10')
  })
  test('startOfNextDay is the next 4 am', () => {
    expect(startOfNextDay(new Date(2026, 0, 10, 12).getTime())).toBe(
      new Date(2026, 0, 11, 4).getTime(),
    )
    expect(startOfNextDay(new Date(2026, 0, 10, 2).getTime())).toBe(
      new Date(2026, 0, 10, 4).getTime(),
    )
  })
})

describe('card conversion', () => {
  test('round-trips through the FSRS card type', () => {
    const r = grade(undefined, 3, T0, f)
    expect(fromCard(toCard(r))).toEqual(r)
  })
  test('new records are new and due now', () => {
    const r = newRecord(T0)
    expect(r.state).toBe(0)
    expect(r.due).toBe(T0)
    expect(r.reps).toBe(0)
  })
})

describe('grading', () => {
  test('Again on a new card keeps it in learning for about a minute', () => {
    const r = grade(undefined, 1, T0, f)
    expect(r.state).toBe(1)
    expect(r.due - T0).toBe(1 * MIN)
  })

  test('Good twice graduates the card to review', () => {
    let r = grade(undefined, 3, T0, f)
    expect(r.state).toBe(1)
    r = grade(r, 3, r.due, f)
    expect(r.state).toBe(2)
    expect(r.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  test('Easy graduates a new card immediately', () => {
    const r = grade(undefined, 4, T0, f)
    expect(r.state).toBe(2)
  })

  test('intervals grow with successful reviews', () => {
    let r = grade(undefined, 4, T0, f)
    let last = r.scheduled_days
    for (let i = 0; i < 4; i++) {
      r = grade(r, 3, r.due, f)
      expect(r.scheduled_days).toBeGreaterThan(last)
      last = r.scheduled_days
    }
  })

  test('a lapse moves a review card to relearning and counts the lapse', () => {
    let r = grade(undefined, 4, T0, f)
    r = grade(r, 1, r.due, f)
    expect(r.state).toBe(3)
    expect(r.lapses).toBe(1)
  })

  test('previewIntervals are ordered Again < Hard < Good < Easy', () => {
    const p = previewIntervals(undefined, T0, f)
    expect(p[1]).toBeLessThan(p[2])
    expect(p[2]).toBeLessThan(p[3])
    expect(p[3]).toBeLessThan(p[4])
  })
})

describe('formatInterval', () => {
  test.each([
    [30_000, '<1m'],
    [MIN, '1m'],
    [10 * MIN, '10m'],
    [3 * 60 * MIN, '3h'],
    [DAY, '1d'],
    [12 * DAY, '12d'],
    [60 * DAY, '2mo'],
    [548 * DAY, '1.5y'],
    [4000 * DAY, '11y'],
  ])('%d ms → %s', (ms, label) => expect(formatInterval(ms)).toBe(label))
})

describe('mastery', () => {
  const review = (days: number): CardRecord => ({
    ...newRecord(T0),
    state: 2,
    scheduled_days: days,
  })

  test('levels', () => {
    expect(masteryLevel(undefined)).toBe('new')
    expect(masteryLevel(newRecord(T0))).toBe('new')
    expect(masteryLevel(grade(undefined, 1, T0, f))).toBe('learning')
    expect(masteryLevel(review(3))).toBe('young')
    expect(masteryLevel(review(MATURE_DAYS))).toBe('mature')
    expect(masteryLevel({ ...review(30), state: 3 })).toBe('learning')
  })

  test('atLeast', () => {
    expect(atLeast('mature', 'young')).toBe(true)
    expect(atLeast('young', 'young')).toBe(true)
    expect(atLeast('learning', 'young')).toBe(false)
  })

  test('retrievability decays over time', () => {
    const r = grade(undefined, 4, T0, f)
    const soon = retrievability(r, T0 + DAY, f)!
    const later = retrievability(r, T0 + 30 * DAY, f)!
    expect(soon).toBeGreaterThan(later)
    expect(soon).toBeLessThanOrEqual(1)
    expect(retrievability(undefined, T0, f)).toBeUndefined()
  })
})

describe('deckKana', () => {
  test('hiragana and combined decks skip katakana-only kana', () => {
    const groups = ['basic', 'extended'] as const
    expect(deckKana('hiragana', groups)).toHaveLength(46)
    expect(deckKana('combined', groups)).toHaveLength(46)
    expect(deckKana('katakana', groups)).toHaveLength(65)
  })
  test('listening decks include every kana, yōon too', () => {
    const all = ['basic', 'dakuten', 'yoon', 'extended'] as const
    expect(deckKana('listen-hiragana', all)).toHaveLength(104)
    expect(deckKana('listen-katakana', all)).toHaveLength(123)
  })
})

describe('buildQueue', () => {
  const kana = kanaInGroups(['basic'])

  test('an empty deck yields only new cards up to the limit, in order', () => {
    const q = buildQueue({
      cards: {},
      kana,
      now: T0,
      newLimit: 5,
      reviewLimit: 100,
      newShownToday: 0,
    })
    expect(q.fresh).toEqual(['a', 'i', 'u', 'e', 'o'])
    expect(q.review).toEqual([])
    expect(q.learning).toEqual([])
  })

  test('respects new cards already shown today', () => {
    const q = buildQueue({
      cards: {},
      kana,
      now: T0,
      newLimit: 5,
      reviewLimit: 100,
      newShownToday: 3,
    })
    expect(q.fresh).toHaveLength(2)
    const none = buildQueue({
      cards: {},
      kana,
      now: T0,
      newLimit: 5,
      reviewLimit: 100,
      newShownToday: 9,
    })
    expect(none.fresh).toHaveLength(0)
  })

  test('due reviews are included most overdue first; future ones are not', () => {
    const base = grade(undefined, 4, T0 - 10 * DAY, f)
    const cards = {
      a: { ...base, due: T0 - 2 * DAY },
      i: { ...base, due: T0 - 5 * DAY },
      u: { ...base, due: T0 + 3 * DAY },
    }
    const q = buildQueue({ cards, kana, now: T0, newLimit: 0, reviewLimit: 100, newShownToday: 0 })
    expect(q.review).toEqual(['i', 'a'])
  })

  test('reviews due later today are included', () => {
    const base = grade(undefined, 4, T0 - 10 * DAY, f)
    const q = buildQueue({
      cards: { a: { ...base, due: T0 + 6 * 3600_000 } },
      kana,
      now: T0,
      newLimit: 0,
      reviewLimit: 100,
      newShownToday: 0,
    })
    expect(q.review).toEqual(['a'])
  })

  test('the review limit caps reviews', () => {
    const base = grade(undefined, 4, T0 - 10 * DAY, f)
    const cards = Object.fromEntries(kana.map((k) => [k.id, { ...base, due: T0 - DAY }]))
    const q = buildQueue({
      cards,
      kana,
      now: T0,
      newLimit: 10,
      reviewLimit: 7,
      newShownToday: 0,
      reviewedToday: 2,
    })
    expect(q.review).toHaveLength(5)
    expect(q.fresh).toHaveLength(0)
  })

  test('learning cards within the learn-ahead window are included', () => {
    const l = grade(undefined, 1, T0, f)
    const q = buildQueue({
      cards: { a: l, i: { ...l, due: T0 + LEARN_AHEAD_MS + MIN } },
      kana,
      now: T0,
      newLimit: 0,
      reviewLimit: 100,
      newShownToday: 0,
    })
    expect(q.learning).toEqual(['a'])
  })
})

describe('Session', () => {
  test('interleaves one new card after every three reviews', () => {
    const s = new Session({ learning: [], review: ['r1', 'r2', 'r3', 'r4'], fresh: ['n1', 'n2'] })
    const order: string[] = []
    const reviewed: CardRecord = { ...newRecord(T0), state: 2, due: T0 + 5 * DAY }
    for (let id = s.next(T0); id; id = s.next(T0)) {
      order.push(id)
      s.answer(id, reviewed, T0)
    }
    expect(order).toEqual(['r1', 'r2', 'r3', 'n1', 'r4', 'n2'])
    expect(s.done).toBe(6)
    expect(s.remaining).toBe(0)
  })

  test('learning cards do not count towards the new-card rhythm', () => {
    const s = new Session({
      learning: ['l1', 'l2', 'l3'],
      review: ['r1', 'r2', 'r3', 'r4'],
      fresh: ['n1'],
    })
    const reviewed: CardRecord = { ...newRecord(T0), state: 2, due: T0 + 5 * DAY }
    const order: string[] = []
    for (let id = s.next(T0); id; id = s.next(T0)) {
      order.push(id)
      s.answer(id, reviewed, T0)
    }
    expect(order).toEqual(['l1', 'l2', 'l3', 'r1', 'r2', 'r3', 'n1', 'r4'])
  })

  test('progress counts every first answer, whatever the grade', () => {
    const s = new Session({ learning: [], review: [], fresh: ['a', 'i', 'u'] })
    expect(s.progress).toBe(0)
    // Good on a new card keeps it in learning, but it still counts as seen.
    s.answer(s.next(T0)!, grade(undefined, 3, T0, f), T0)
    expect(s.seenCount).toBe(1)
    expect(s.progress).toBeCloseTo(1 / 3)
    expect(s.unseen).toBe(2)
    expect(s.repeating).toBe(1)
    // Seeing the same card again doesn't count twice.
    s.answer('a', grade(grade(undefined, 3, T0, f), 1, T0, f), T0)
    expect(s.seenCount).toBe(1)
    expect(s.repeating).toBe(1)
    // Easy graduates the card: no longer repeating.
    s.answer('i', grade(undefined, 4, T0, f), T0)
    expect(s.repeating).toBe(1)
    expect(s.unseen).toBe(1)
  })

  test('an empty session is complete', () => {
    expect(new Session({ learning: [], review: [], fresh: [] }).progress).toBe(1)
  })

  test('learning cards from before the session count as unseen until answered', () => {
    const s = new Session({ learning: ['l'], review: [], fresh: [] })
    expect(s.unseen).toBe(1)
    expect(s.repeating).toBe(0)
  })

  test('shows learning cards first', () => {
    const s = new Session({ learning: ['l1'], review: ['r1'], fresh: [] })
    expect(s.next(T0)).toBe('l1')
  })

  test('cards answered Again come back when due', () => {
    const s = new Session({ learning: [], review: [], fresh: ['a', 'i'] })
    expect(s.next(T0)).toBe('a')
    s.answer('a', grade(undefined, 1, T0, f), T0)
    // 'a' is due in a minute; 'i' comes first.
    expect(s.next(T0 + 1000)).toBe('i')
    s.answer('i', grade(undefined, 4, T0, f), T0)
    // Only the learning card is left: learn ahead.
    expect(s.next(T0 + 2000)).toBe('a')
    expect(s.waitMs(T0 + 2000)).toBeGreaterThan(0)
    s.answer('a', grade(undefined, 4, T0, f), T0 + 2000)
    expect(s.next(T0 + 3000)).toBeUndefined()
  })

  test('isNew and total', () => {
    const s = new Session({ learning: [], review: ['r'], fresh: ['n'] })
    expect(s.isNew('n')).toBe(true)
    expect(s.isNew('r')).toBe(false)
    expect(s.total).toBe(2)
    expect(queueSize({ learning: ['x'], review: ['r'], fresh: ['n'] })).toBe(3)
  })
})
