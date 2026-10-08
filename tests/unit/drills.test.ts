import { describe, expect, test } from 'vitest'
import { confusableSets } from '../../src/lib/data/confusables'
import { drillDeck, personalSets, quizOptions, quizRounds } from '../../src/lib/study/drills'

const shiTsu = confusableSets.find((s) => s.id === 'shi-tsu')!
const mixed = confusableSets.find((s) => s.script === 'mixed')!

describe('quizRounds', () => {
  test('has the requested length and only uses chars from the set', () => {
    const rounds = quizRounds(shiTsu, 12)
    expect(rounds).toHaveLength(12)
    for (const r of rounds) expect(shiTsu.chars).toContain(r)
  })
  test('never repeats the same char twice in a row', () => {
    for (let i = 0; i < 20; i++) {
      const rounds = quizRounds(confusableSets[i % confusableSets.length], 15)
      for (let j = 1; j < rounds.length; j++) expect(rounds[j]).not.toBe(rounds[j - 1])
    }
  })
  test('is balanced', () => {
    const rounds = quizRounds(shiTsu, 10)
    expect(rounds.filter((r) => r === 'シ')).toHaveLength(5)
  })
})

describe('quizOptions', () => {
  test('same-script sets are answered by romaji', () => {
    expect(quizOptions(shiTsu)).toEqual([
      { char: 'シ', label: 'shi' },
      { char: 'ツ', label: 'tsu' },
    ])
  })
  test('mixed sets are answered by script', () => {
    expect(
      quizOptions(mixed)
        .map((o) => o.label)
        .sort(),
    ).toEqual(['Hiragana', 'Katakana'])
  })
})

describe('drillDeck', () => {
  test('maps characters to the right deck', () => {
    expect(drillDeck(shiTsu, 'シ')).toBe('katakana')
    const [a, b] = mixed.chars
    expect([drillDeck(mixed, a), drillDeck(mixed, b)].sort()).toEqual(['hiragana', 'katakana'])
  })
})

describe('personalSets', () => {
  test('builds sets from repeated confusions in the right script', () => {
    const sets = personalSets([
      { shown: 'nu', answered: 'me', count: 3, deck: 'hiragana' },
      { shown: 'shi', answered: 'tsu', count: 2, deck: 'katakana' },
      { shown: 'ka', answered: 'ga', count: 1, deck: 'hiragana' },
    ])
    expect(sets.map((s) => s.chars)).toEqual([
      ['ぬ', 'め'],
      ['シ', 'ツ'],
    ])
    expect(sets[0].hints['ぬ']).toContain('3 times')
  })
})
