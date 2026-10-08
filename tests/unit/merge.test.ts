import { describe, expect, test } from 'vitest'
import { grade } from '../../src/lib/srs/scheduler'
import { mergeLogs, mergeSaves } from '../../src/lib/storage/merge'
import { emptySave, type ReviewEntry, type SaveFile } from '../../src/lib/storage/schema'
import { recordReview, recordWord } from '../../src/lib/study/actions'

const T = new Date(2026, 5, 1, 10).getTime()
const MIN = 60_000

function device(createdAt: number): SaveFile {
  return emptySave(createdAt)
}

describe('mergeSaves', () => {
  test('reviews on two devices are both kept', () => {
    const phone = device(1)
    const laptop = device(2)
    recordReview(phone, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: T })
    recordReview(laptop, { deck: 'hiragana', id: 'i', grade: 4, ms: 1, now: T + MIN })
    recordReview(laptop, { deck: 'katakana', id: 'ka', grade: 1, ms: 1, now: T + 2 * MIN })
    const merged = mergeSaves(phone, laptop)
    expect(Object.keys(merged.cards.hiragana!).sort()).toEqual(['a', 'i'])
    expect(Object.keys(merged.cards.katakana!)).toEqual(['ka'])
    expect(merged.log.map((e) => e.id)).toEqual(['a', 'i', 'ka'])
    expect(merged.createdAt).toBe(1)
  })

  test('the most recently reviewed version of a card wins', () => {
    const a = device(1)
    const b = device(1)
    a.cards.hiragana = { a: grade(undefined, 4, T) }
    b.cards.hiragana = { a: grade(grade(undefined, 4, T), 3, T + 5 * 86_400_000) }
    expect(mergeSaves(a, b).cards.hiragana!.a).toEqual(b.cards.hiragana.a)
    expect(mergeSaves(b, a).cards.hiragana!.a).toEqual(b.cards.hiragana.a)
  })

  test('is commutative and idempotent', () => {
    const a = device(1)
    const b = device(2)
    recordReview(a, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: T })
    recordReview(b, { deck: 'hiragana', id: 'a', grade: 1, ms: 1, now: T + MIN })
    recordWord(a, 'ねこ', true, T)
    recordWord(b, 'ねこ', false, T + 1)
    b.seenNotes.push('sokuon')
    a.sprints.hiragana = [{ score: 12, at: 5 }]
    b.sprints.hiragana = [
      { score: 12, at: 5 },
      { score: 15, at: 9 },
    ]
    const ab = mergeSaves(a, b)
    expect(mergeSaves(b, a)).toEqual(ab)
    expect(mergeSaves(ab, ab)).toEqual(ab)
    expect(mergeSaves(ab, a)).toEqual(ab)
    expect(ab.sprints.hiragana).toEqual([
      { score: 12, at: 5 },
      { score: 15, at: 9 },
    ])
    expect(ab.words['ねこ']).toEqual({ seen: 1, correct: 1, last: T + 1 })
  })

  test('the most recently changed settings win', () => {
    const a = device(1)
    const b = device(1)
    a.settings.theme = 'dark'
    a.settingsUpdatedAt = 10
    b.settings.theme = 'light'
    b.settingsUpdatedAt = 20
    expect(mergeSaves(a, b).settings.theme).toBe('light')
    b.settingsUpdatedAt = 5
    expect(mergeSaves(a, b).settings.theme).toBe('dark')
  })

  test('daily counters: the later day wins, the same day takes the higher count', () => {
    const a = device(1)
    const b = device(1)
    a.daily = { day: '2026-06-01', newShown: { hiragana: 3 } }
    b.daily = { day: '2026-06-01', newShown: { hiragana: 5, katakana: 1 } }
    expect(mergeSaves(a, b).daily).toEqual({
      day: '2026-06-01',
      newShown: { hiragana: 5, katakana: 1 },
    })
    b.daily = { day: '2026-06-02', newShown: { katakana: 2 } }
    expect(mergeSaves(a, b).daily).toEqual(b.daily)
  })

  test('merging with an empty copy changes nothing but the order', () => {
    const a = device(1)
    recordReview(a, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: T })
    const merged = mergeSaves(a, device(5))
    expect(merged.cards).toEqual(a.cards)
    expect(merged.log).toEqual(a.log)
  })
})

describe('mergeLogs', () => {
  test('removes duplicates and sorts by time', () => {
    const e = (t: number, id: string): ReviewEntry => ({ t, mode: 'srs', id, correct: true, ms: 1 })
    expect(mergeLogs([e(2, 'b'), e(1, 'a')], [e(1, 'a'), e(3, 'c')]).map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
