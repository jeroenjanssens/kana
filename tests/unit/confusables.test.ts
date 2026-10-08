import { describe, expect, test } from 'vitest'
import { confusableSets } from '../../src/lib/data/confusables'
import { kanaByChar, scriptOf } from '../../src/lib/data/kana'

describe('confusable sets', () => {
  test('there are plenty of sets', () => expect(confusableSets.length).toBeGreaterThanOrEqual(25))

  test('ids are unique', () => {
    const ids = confusableSets.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test.each(confusableSets.map((s) => [s.id, s] as const))('%s is well-formed', (_, set) => {
    expect(set.chars.length).toBeGreaterThanOrEqual(2)
    expect(new Set(set.chars).size).toBe(set.chars.length)
    for (const c of set.chars) {
      expect(kanaByChar(c), c).toBeDefined()
      expect(set.hints[c], c).toBeTruthy()
      expect(set.hints[c].length).toBeLessThanOrEqual(130)
    }
    const scripts = new Set(set.chars.map(scriptOf))
    if (set.script === 'mixed') expect(scripts.size).toBe(2)
    else expect([...scripts]).toEqual([set.script])
  })

  test('same-script sets have distinct sounds so they can be quizzed by romaji', () => {
    for (const set of confusableSets.filter((s) => s.script !== 'mixed')) {
      const romaji = set.chars.map((c) => kanaByChar(c)!.romaji)
      expect(new Set(romaji).size, set.id).toBe(romaji.length)
    }
  })

  test('includes the classic sets', () => {
    const titles = confusableSets.map((s) => s.chars.join(''))
    for (const classic of ['シツ', 'ソン', 'ぬめ', 'るろ', 'へヘ'])
      expect(titles).toContain(classic)
  })
})
