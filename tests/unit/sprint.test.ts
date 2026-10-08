import { describe, expect, test } from 'vitest'
import { kanaById } from '../../src/lib/data/kana'
import { grade } from '../../src/lib/srs/scheduler'
import { migrate } from '../../src/lib/storage/persistence'
import { emptySave } from '../../src/lib/storage/schema'
import {
  bestSprint,
  judge,
  nextSprintKana,
  recordSprint,
  sprintPool,
} from '../../src/lib/study/sprint'

describe('judge', () => {
  test.each([
    ['ka', 'k', 'pending'],
    ['ka', 'ka', 'correct'],
    ['ka', 'ki', 'wrong'],
    ['shi', 'si', 'correct'],
    ['shi', 'sh', 'pending'],
    ['shi', 'sa', 'wrong'],
    ['n', 'n', 'correct'],
    ['nya', 'n', 'pending'],
    ['nya', 'nya', 'correct'],
    ['wo', 'o', 'correct'],
    ['ka', '', 'pending'],
    ['ka', ' KA ', 'correct'],
  ])('%s: typing "%s" is %s', (id, input, expected) => {
    expect(judge(input, kanaById(id))).toBe(expected)
  })
})

describe('pool', () => {
  test('falls back to the basic kana when little has been studied', () => {
    expect(sprintPool(emptySave(), 'hiragana')).toHaveLength(46)
  })

  test('uses the studied kana once there are enough', () => {
    const s = emptySave()
    const ids = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko', 'ga']
    s.cards.katakana = Object.fromEntries(ids.map((id) => [id, grade(undefined, 3, 0)]))
    expect(sprintPool(s, 'katakana').map((k) => k.id)).toEqual(ids.slice(0, 10).concat('ga'))
    expect(sprintPool(s, 'hiragana')).toHaveLength(46)
  })

  test('nextSprintKana never repeats the previous kana', () => {
    const pool = [kanaById('a'), kanaById('i')]
    for (let n = 0; n < 20; n++) expect(nextSprintKana(pool, pool[0]).id).toBe('i')
  })
})

describe('records', () => {
  test('keeps results and reports new records', () => {
    const s = emptySave()
    expect(bestSprint(s, 'hiragana')).toBe(0)
    expect(recordSprint(s, 'hiragana', 12, 1)).toBe(true)
    expect(recordSprint(s, 'hiragana', 9, 2)).toBe(false)
    expect(recordSprint(s, 'hiragana', 15, 3)).toBe(true)
    expect(bestSprint(s, 'hiragana')).toBe(15)
    expect(bestSprint(s, 'katakana')).toBe(0)
  })

  test('keeps at most 50 results', () => {
    const s = emptySave()
    for (let i = 0; i < 60; i++) recordSprint(s, 'katakana', i, i)
    expect(s.sprints.katakana).toHaveLength(50)
    expect(s.sprints.katakana![0].score).toBe(10)
  })

  test('sprint results survive save and load', () => {
    const s = emptySave()
    recordSprint(s, 'hiragana', 7, 5)
    expect(migrate(JSON.parse(JSON.stringify(s))).sprints).toEqual({
      hiragana: [{ score: 7, at: 5 }],
    })
    expect(migrate({ version: 1, sprints: { hiragana: [{ score: 'x' }] } }).sprints).toEqual({
      hiragana: [],
    })
  })
})
