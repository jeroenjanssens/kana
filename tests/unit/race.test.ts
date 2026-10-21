import { describe, expect, test } from 'vitest'
import { mergeSaves } from '../../src/lib/storage/merge'
import { migrate } from '../../src/lib/storage/persistence'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'
import { resetProgress } from '../../src/lib/study/actions'
import {
  bestRace,
  formatRaceTime,
  raceKey,
  raceOrder,
  raceQuestions,
  recordRace,
} from '../../src/lib/study/race'
import { questionKey } from '../../src/lib/study/scripts'

const GROUPS = ['basic', 'dakuten', 'yoon'] as const

function card(state: CardRecord['state'], scheduled_days = 0): CardRecord {
  const base = { due: 0, stability: 1, difficulty: 5, elapsed_days: 0, learning_steps: 0 }
  return { ...base, scheduled_days, reps: 1, lapses: 0, state }
}

const keys = (qs: Parameters<typeof raceKey>[0]) => qs.map(questionKey)

describe('which kana', () => {
  test('all: every kana in the enabled groups, hiragana before katakana', () => {
    const qs = raceQuestions(emptySave(), { script: 'both', kana: 'all', rows: [] }, ['basic'])
    expect(qs).toHaveLength(92)
    expect(keys(qs).slice(0, 2)).toEqual(['hiragana:a', 'hiragana:i'])
    expect(keys(qs)[46]).toBe('katakana:a')
  })

  test('seen so far: studied in that script or in the combined deck', () => {
    const s = emptySave()
    s.cards.hiragana = { a: card(1), i: card(0) }
    s.cards.combined = { u: card(2, 3) }
    s.cards.katakana = { e: card(3) }
    const setup = { script: 'both' as const, kana: 'seen' as const, rows: [] }
    expect(keys(raceQuestions(s, setup, GROUPS))).toEqual([
      'hiragana:a',
      'hiragana:u',
      'katakana:u',
      'katakana:e',
    ])
  })

  test('mastered: at least young', () => {
    const s = emptySave()
    s.cards.katakana = { a: card(1), i: card(2, 3), u: card(2, 60) }
    const setup = { script: 'katakana' as const, kana: 'mastered' as const, rows: [] }
    expect(keys(raceQuestions(s, setup, GROUPS))).toEqual(['katakana:i', 'katakana:u'])
    expect(raceQuestions(emptySave(), setup, GROUPS)).toEqual([])
  })

  test('rows: a row counts in each chosen script; extended rows only in katakana', () => {
    const setup = {
      script: 'both' as const,
      kana: 'rows' as const,
      rows: ['basic:k', 'extended:f'],
    }
    const qs = keys(raceQuestions(emptySave(), setup, [...GROUPS, 'extended']))
    expect(qs.slice(0, 5)).toEqual([
      'hiragana:ka',
      'hiragana:ki',
      'hiragana:ku',
      'hiragana:ke',
      'hiragana:ko',
    ])
    expect(qs.slice(5, 10)).toEqual([
      'katakana:ka',
      'katakana:ki',
      'katakana:ku',
      'katakana:ke',
      'katakana:ko',
    ])
    expect(qs.slice(10).every((k) => k.startsWith('katakana:x-f'))).toBe(true)
    expect(qs.length).toBeGreaterThan(10)
  })

  test('only kana in the enabled groups', () => {
    const setup = { script: 'hiragana' as const, kana: 'rows' as const, rows: ['dakuten:g'] }
    expect(raceQuestions(emptySave(), setup, ['basic'])).toEqual([])
  })
})

describe('order', () => {
  const qs = raceQuestions(emptySave(), { script: 'both', kana: 'all', rows: [] }, ['basic'])

  test('in order, or shuffled with every question once', () => {
    expect(raceOrder(qs, false)).toEqual(qs)
    const shuffled = raceOrder(qs, true)
    expect(shuffled).not.toEqual(qs)
    expect(keys(shuffled).sort()).toEqual(keys(qs).sort())
  })

  test('the set key ignores the order and tells sets apart', () => {
    expect(raceKey(raceOrder(qs, true))).toBe(raceKey(qs))
    expect(raceKey(qs.slice(1))).not.toBe(raceKey(qs))
    expect(raceKey(qs)).toMatch(/^92-[0-9a-f]{8}$/)
  })
})

describe('records', () => {
  test('keeps the fastest time per set', () => {
    const s = emptySave()
    expect(recordRace(s, 'k', 60_000, 2, 1)).toEqual({ previous: undefined, record: false })
    expect(bestRace(s, 'k')).toEqual({ ms: 60_000, mistakes: 2, at: 1 })
    const slower = recordRace(s, 'k', 70_000, 0, 2)
    expect(slower).toEqual({ previous: { ms: 60_000, mistakes: 2, at: 1 }, record: false })
    expect(recordRace(s, 'k', 50_000, 1, 3).record).toBe(true)
    expect(bestRace(s, 'k')?.ms).toBe(50_000)
    expect(bestRace(s, 'other')).toBeUndefined()
  })

  test('survive save and load, and drop anything malformed', () => {
    const s = emptySave()
    recordRace(s, 'k', 1234.6, 0, 5)
    expect(migrate(JSON.parse(JSON.stringify(s))).races).toEqual({
      k: { ms: 1235, mistakes: 0, at: 5 },
    })
    expect(migrate({ version: 1, races: { k: { ms: 'x' }, j: 3 } }).races).toEqual({})
  })

  test('merging keeps the faster time, and reset clears them', () => {
    const a = emptySave()
    const b = emptySave()
    recordRace(a, 'k', 40_000, 0, 1)
    recordRace(b, 'k', 30_000, 1, 2)
    recordRace(b, 'j', 10_000, 0, 3)
    const merged = mergeSaves(a, b)
    expect(merged.races).toEqual({
      k: { ms: 30_000, mistakes: 1, at: 2 },
      j: { ms: 10_000, mistakes: 0, at: 3 },
    })
    expect(mergeSaves(b, a).races).toEqual(merged.races)
    resetProgress(merged)
    expect(merged.races).toEqual({})
  })

  test('times show minutes, seconds and tenths', () => {
    expect([0, 9_950, 83_400, 600_000].map(formatRaceTime)).toEqual([
      '0:00.0',
      '0:09.9',
      '1:23.4',
      '10:00.0',
    ])
  })
})
