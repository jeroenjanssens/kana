import { describe, expect, test } from 'vitest'
import { parseKanjiVg, characters } from '../../scripts/fetch-kanjivg'
import { KANA } from '../../src/lib/data/kana'
import { GRID, hasStrokes, strokeCount, strokesFor } from '../../src/lib/data/strokes'

describe('KanjiVG parsing', () => {
  test('extracts paths and stroke numbers in order', () => {
    const svg = `<svg><g><path id="s1" d="M1,2c3,4"/><path id="s2" kvg:type="x" d="M5,6"/></g>
      <g><text transform="matrix(1 0 0 1 22.51 35)">1</text><text transform="matrix(1 0 0 1 40 12.5)">2</text></g></svg>`
    expect(parseKanjiVg(svg)).toEqual({
      strokes: ['M1,2c3,4', 'M5,6'],
      numbers: [
        [22.51, 35],
        [40, 12.5],
      ],
    })
  })

  test('the character list covers all kana parts', () => {
    const chars = characters()
    expect(chars).toContain('ゃ')
    expect(chars).toContain('ー')
    expect(chars).toContain('ヴ')
  })
})

describe('stroke data', () => {
  test('exists for every kana character', () => {
    for (const k of KANA) {
      for (const c of k.hiragana + k.katakana) expect(hasStrokes(c), c).toBe(true)
    }
  })

  test('has matching numbers of strokes and stroke numbers', () => {
    for (const k of KANA) {
      for (const g of strokesFor(k.hiragana + k.katakana)) {
        expect(g.numbers.length, g.char).toBe(g.strokes.length)
      }
    }
  })

  test.each([
    ['あ', 3],
    ['い', 2],
    ['し', 1],
    ['ア', 2],
    ['シ', 3],
    ['ツ', 3],
    ['き', 4],
    ['が', 5],
  ])('%s has %i strokes', (char, n) => expect(strokeCount(char)).toBe(n))

  test('multi-character kana are laid out side by side', () => {
    const glyphs = strokesFor('きゃ')
    expect(glyphs.map((g) => g.char)).toEqual(['き', 'ゃ'])
    expect(glyphs[1].x).toBe(GRID)
  })

  test('unknown characters are skipped', () => {
    expect(strokesFor('x')).toEqual([])
  })
})
