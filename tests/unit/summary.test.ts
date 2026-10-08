import { describe, expect, test } from 'vitest'
import { recordReview } from '../../src/lib/study/actions'
import { deckSummary, queueFor } from '../../src/lib/study/summary'
import { emptySave } from '../../src/lib/storage/schema'

const NOW = new Date(2026, 6, 1, 10).getTime()

describe('deck summaries', () => {
  test('a fresh save has only new cards', () => {
    const s = emptySave()
    const sum = deckSummary(s, 'hiragana', NOW)
    expect(sum.total).toBe(46 + 25 + 33)
    expect(sum.due).toBe(0)
    expect(sum.fresh).toBe(10)
    expect(sum.mastery.new).toBe(sum.total)
  })

  test('studying new cards reduces what is left today', () => {
    const s = emptySave()
    for (const id of ['a', 'i', 'u'])
      recordReview(s, { deck: 'hiragana', id, grade: 1, ms: 1, now: NOW })
    const sum = deckSummary(s, 'hiragana', NOW + 1000)
    expect(sum.fresh).toBe(7)
    expect(sum.due).toBe(3)
    expect(sum.mastery.learning).toBe(3)
  })

  test('respects enabled groups and settings', () => {
    const s = emptySave()
    s.settings.groups = ['basic']
    s.settings.newPerDay = 50
    expect(deckSummary(s, 'katakana', NOW)).toMatchObject({ total: 46, fresh: 46 })
    s.settings.groups = ['basic', 'extended']
    expect(deckSummary(s, 'katakana', NOW).total).toBe(65)
  })

  test('queueFor returns new cards in learning order', () => {
    const s = emptySave()
    expect(queueFor(s, 'combined', NOW).fresh.slice(0, 6)).toEqual(['a', 'i', 'u', 'e', 'o', 'ka'])
  })
})
