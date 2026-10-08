import { describe, expect, test } from 'vitest'
import { becameLeech, isLeech, leeches } from '../../src/lib/study/leeches'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'

const card = (lapses: number): CardRecord => ({
  due: 0,
  stability: 1,
  difficulty: 8,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: lapses + 2,
  lapses,
  state: 3,
})

describe('leeches', () => {
  test('a card is a leech from the threshold on', () => {
    expect(isLeech(undefined)).toBe(false)
    expect(isLeech(card(5))).toBe(false)
    expect(isLeech(card(6))).toBe(true)
    expect(isLeech(card(3), 3)).toBe(true)
  })

  test('becameLeech is true only at the moment of crossing', () => {
    expect(becameLeech(card(5), card(6))).toBe(true)
    expect(becameLeech(card(6), card(7))).toBe(false)
    expect(becameLeech(card(4), card(4))).toBe(false)
    expect(becameLeech(undefined, card(1), 1)).toBe(true)
  })

  test('leeches lists them across decks, worst first', () => {
    const s = emptySave()
    s.cards.hiragana = { nu: card(7), me: card(2) }
    s.cards.katakana = { shi: card(9) }
    expect(leeches(s)).toEqual([
      { deck: 'katakana', id: 'shi', lapses: 9 },
      { deck: 'hiragana', id: 'nu', lapses: 7 },
    ])
  })
})
