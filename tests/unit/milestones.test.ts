import { describe, expect, test } from 'vitest'
import { isStreakMilestone, rowMastered } from '../../src/lib/study/milestones'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'

const mature: CardRecord = {
  due: 0,
  stability: 50,
  difficulty: 4,
  elapsed_days: 0,
  scheduled_days: 30,
  learning_steps: 0,
  reps: 6,
  lapses: 0,
  state: 2,
}

describe('rowMastered', () => {
  test('returns the row once all its kana are mature', () => {
    const s = emptySave()
    s.cards.hiragana = { ka: mature, ki: mature, ku: mature, ke: mature }
    expect(rowMastered(s, 'hiragana', 'ke')).toBeUndefined()
    s.cards.hiragana.ko = mature
    expect(rowMastered(s, 'hiragana', 'ko')).toEqual(['ka', 'ki', 'ku', 'ke', 'ko'])
  })

  test('works for short rows and other decks', () => {
    const s = emptySave()
    s.cards.katakana = { ya: mature, yu: mature, yo: mature }
    expect(rowMastered(s, 'katakana', 'yu')).toEqual(['ya', 'yu', 'yo'])
    expect(rowMastered(s, 'hiragana', 'yu')).toBeUndefined()
  })

  test('unknown kana', () => {
    expect(rowMastered(emptySave(), 'hiragana', 'nope')).toBeUndefined()
  })
})

test('streak milestones', () => {
  expect(isStreakMilestone(7)).toBe(true)
  expect(isStreakMilestone(8)).toBe(false)
})
