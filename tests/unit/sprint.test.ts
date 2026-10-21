import { describe, expect, test } from 'vitest'
import { kanaById } from '../../src/lib/data/kana'
import { kanaForAnswer } from '../../src/lib/study/answer'
import { grade } from '../../src/lib/srs/scheduler'
import { migrate } from '../../src/lib/storage/persistence'
import { emptySave } from '../../src/lib/storage/schema'
import { mergeSaves } from '../../src/lib/storage/merge'
import {
  answerPool,
  bestSprint,
  formatClock,
  judge,
  nextQuestion,
  recordSprint,
  sprintLength,
  sprintPool,
  sprintQuestions,
} from '../../src/lib/study/sprint'

describe('judge', () => {
  test.each([
    ['ka', 'k', 'pending'],
    ['ka', 'ka', 'correct'],
    ['ka', 'ki', 'wrong'],
    ['ka', 's', 'pending'],
    ['ka', 'sa', 'wrong'],
    ['ka', 'n', 'pending'],
    ['ka', 'a', 'wrong'],
    ['ka', 'x', 'pending'],
    ['ka', 'xy', 'wrong'],
    ['ka', 'nn', 'wrong'],
    ['ka', 'nk', 'wrong'],
    ['ka', 'ky', 'pending'],
    ['ka', 'kyo', 'wrong'],
    ['shi', 'ts', 'pending'],
    ['shi', 'tsu', 'wrong'],
    ['shi', 'ch', 'pending'],
    ['shi', 'chi', 'wrong'],
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

describe('answerPool', () => {
  test('names kana outside the sprint pool, but only ones that exist in the script', () => {
    expect(kanaForAnswer('kyo', answerPool('hiragana'))?.id).toBe('kyo')
    expect(kanaForAnswer('fa', answerPool('hiragana'))).toBeUndefined()
    expect(kanaForAnswer('fa', answerPool('katakana'))?.id).toBe('x-fa')
    expect(kanaForAnswer('ji', answerPool('hiragana'))?.id).toBe('ji')
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

  test('nextQuestion never repeats the previous question', () => {
    const pool = [
      { kana: kanaById('a'), script: 'hiragana' as const },
      { kana: kanaById('a'), script: 'katakana' as const },
    ]
    for (let n = 0; n < 20; n++) expect(nextQuestion(pool, pool[0]).script).toBe('katakana')
  })

  test('both scripts draw from each pool, in its own script', () => {
    const s = emptySave()
    const both = sprintQuestions(s, 'both')
    expect(both).toHaveLength(92)
    expect(both.filter((q) => q.script === 'katakana')).toHaveLength(46)
    expect(sprintQuestions(s, 'katakana').every((q) => q.script === 'katakana')).toBe(true)
  })
})

describe('lengths', () => {
  test('only 1, 2, 3 and 5 minutes', () => {
    expect([1, 2, 3, 5, 4, 0, 60].map(sprintLength)).toEqual([1, 2, 3, 5, 1, 1, 1])
  })

  test('the clock shows minutes and seconds', () => {
    expect([0, 9, 60, 272, 300].map(formatClock)).toEqual(['0:00', '0:09', '1:00', '4:32', '5:00'])
  })
})

describe('records', () => {
  test('keeps results and reports new records', () => {
    const s = emptySave()
    expect(bestSprint(s, 'hiragana', 1)).toBe(0)
    expect(recordSprint(s, 'hiragana', 1, 12, 1)).toBe(true)
    expect(recordSprint(s, 'hiragana', 1, 9, 2)).toBe(false)
    expect(recordSprint(s, 'hiragana', 1, 15, 3)).toBe(true)
    expect(bestSprint(s, 'hiragana', 1)).toBe(15)
    expect(bestSprint(s, 'katakana', 1)).toBe(0)
  })

  test('each length and script choice has its own record', () => {
    const s = emptySave()
    recordSprint(s, 'hiragana', 1, 30, 1)
    expect(recordSprint(s, 'hiragana', 5, 20, 2)).toBe(true)
    expect(recordSprint(s, 'both', 1, 10, 3)).toBe(true)
    expect(bestSprint(s, 'hiragana', 1)).toBe(30)
    expect(bestSprint(s, 'hiragana', 5)).toBe(20)
    expect(bestSprint(s, 'hiragana', 2)).toBe(0)
    expect(bestSprint(s, 'both', 1)).toBe(10)
  })

  test('sprints saved before lengths existed count as one minute', () => {
    const s = migrate({ version: 1, sprints: { katakana: [{ score: 25, at: 1 }] } })
    expect(bestSprint(s, 'katakana', 1)).toBe(25)
    expect(bestSprint(s, 'katakana', 2)).toBe(0)
  })

  test('keeps at most 50 results per length', () => {
    const s = emptySave()
    recordSprint(s, 'katakana', 5, 99, 0)
    for (let i = 1; i <= 60; i++) recordSprint(s, 'katakana', 1, i, i)
    expect(s.sprints.katakana).toHaveLength(51)
    expect(s.sprints.katakana![0]).toEqual({ score: 99, at: 0, minutes: 5 })
    expect(s.sprints.katakana![1].score).toBe(11)
    expect(bestSprint(s, 'katakana', 5)).toBe(99)
  })

  test('sprint results survive save and load', () => {
    const s = emptySave()
    recordSprint(s, 'hiragana', 1, 7, 5)
    recordSprint(s, 'both', 3, 40, 6)
    expect(migrate(JSON.parse(JSON.stringify(s))).sprints).toEqual({
      hiragana: [{ score: 7, at: 5 }],
      both: [{ score: 40, at: 6, minutes: 3 }],
    })
    expect(migrate({ version: 1, sprints: { hiragana: [{ score: 'x' }] } }).sprints).toEqual({
      hiragana: [],
    })
  })

  test('merging keeps sprints of different lengths at the same moment', () => {
    const a = emptySave()
    const b = emptySave()
    recordSprint(a, 'both', 1, 10, 5)
    recordSprint(b, 'both', 2, 10, 5)
    expect(mergeSaves(a, b).sprints.both).toHaveLength(2)
  })
})
