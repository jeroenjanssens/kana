import { describe, expect, test } from 'vitest'
import { sanitizeSettings } from '../../src/lib/storage/persistence'
import { DEFAULT_SETTINGS } from '../../src/lib/storage/schema'
import { glyph } from '../../src/lib/data/kana'
import { strokeCount } from '../../src/lib/data/strokes'
import { questionKey } from '../../src/lib/study/scripts'
import {
  MIN_BLANKS,
  SHEET_SIZES,
  cellKinds,
  cellsPerRow,
  fadeOpacities,
  paginate,
  STROKE_COLOURS,
  rowsPerPage,
  strokeColour,
  worksheetKana,
  worksheetOrder,
  worksheetRows,
} from '../../src/lib/study/worksheet'

const GROUPS = ['basic', 'dakuten', 'yoon'] as const

describe('sizes', () => {
  test('squares and rows that fit on an A4 page', () => {
    expect(SHEET_SIZES.map(cellsPerRow)).toEqual([23, 18, 14, 12, 10])
    expect(SHEET_SIZES.map(rowsPerPage)).toEqual([21, 18, 14, 12, 10])
  })

  test('a row: the model, the numbered one, the traces, then at least two blank squares', () => {
    for (const size of SHEET_SIZES) {
      const kinds = cellKinds(size).map((c) => c.kind)
      expect(kinds).toHaveLength(cellsPerRow(size))
      expect(kinds.slice(0, 2)).toEqual(['model', 'numbered'])
      expect(kinds.slice(-MIN_BLANKS)).toEqual(Array(MIN_BLANKS).fill('blank'))
    }
    const count = (size: (typeof SHEET_SIZES)[number], kind: string) =>
      cellKinds(size).filter((c) => c.kind === kind).length
    expect(SHEET_SIZES.map((size) => count(size, 'trace'))).toEqual([10, 10, 10, 8, 6])
    expect(SHEET_SIZES.map((size) => count(size, 'blank'))).toEqual([11, 6, 2, 2, 2])
  })

  test('fewer traces fade out quicker, from the same clear guide to the same faint one', () => {
    const traces = cellKinds('xlarge').flatMap((c) => (c.kind === 'trace' ? [c.opacity] : []))
    expect(traces[0]).toBeCloseTo(0.45)
    expect(traces.at(-1)).toBeCloseTo(0.08)
  })

  test('the traces fade from a clear guide to a faint one', () => {
    const fades = fadeOpacities()
    expect(fades).toHaveLength(10)
    expect(fades[0]).toBeCloseTo(0.45)
    expect(fades[9]).toBeCloseTo(0.08)
    for (let i = 1; i < fades.length; i++) expect(fades[i]).toBeLessThan(fades[i - 1])
  })
})

test('a different colour for every stroke of every kana on a worksheet', () => {
  expect(new Set(STROKE_COLOURS).size).toBe(STROKE_COLOURS.length)
  const rows = worksheetRows('both', GROUPS).map((r) => r.key)
  const kana = worksheetKana({ script: 'both', rows }, GROUPS)
  const most = Math.max(...kana.map((q) => strokeCount(glyph(q.kana, q.script))))
  expect(most).toBeLessThanOrEqual(STROKE_COLOURS.length)
  expect(strokeColour(0)).toBe(STROKE_COLOURS[0])
  expect(strokeColour(STROKE_COLOURS.length)).toBe(STROKE_COLOURS[0])
})

describe('which kana', () => {
  test('only rows of single characters: basic and dakuten', () => {
    const rows = worksheetRows('both', [...GROUPS, 'extended'])
    expect(new Set(rows.map((r) => r.group))).toEqual(new Set(['basic', 'dakuten']))
    expect(rows.map((r) => r.key)).toContain('dakuten:g')
  })

  test('the groups enabled in Settings', () => {
    expect(worksheetRows('hiragana', ['basic']).every((r) => r.group === 'basic')).toBe(true)
  })

  test('the chosen rows, hiragana before katakana', () => {
    const kana = worksheetKana({ script: 'both', rows: ['basic:a', 'dakuten:g'] }, GROUPS)
    expect(kana.map(questionKey)).toEqual([
      ...['a', 'i', 'u', 'e', 'o', 'ga', 'gi', 'gu', 'ge', 'go'].map((id) => `hiragana:${id}`),
      ...['a', 'i', 'u', 'e', 'o', 'ga', 'gi', 'gu', 'ge', 'go'].map((id) => `katakana:${id}`),
    ])
  })

  test('every basic and dakuten kana in both scripts', () => {
    const rows = worksheetRows('both', GROUPS).map((r) => r.key)
    expect(worksheetKana({ script: 'hiragana', rows }, GROUPS)).toHaveLength(71)
    expect(worksheetKana({ script: 'katakana', rows }, GROUPS)).toHaveLength(71)
  })

  test('random order keeps every kana, and table order is unchanged', () => {
    const kana = worksheetKana({ script: 'both', rows: ['basic:a', 'basic:k'] }, GROUPS)
    expect(worksheetOrder(kana, false)).toEqual(kana)
    let n = 0
    const shuffled = worksheetOrder(kana, true, () => (n = (n * 7 + 3) % 11) / 11)
    expect(shuffled).not.toEqual(kana)
    expect(shuffled.map(questionKey).sort()).toEqual(kana.map(questionKey).sort())
  })
})

test('pages of a fixed number of rows', () => {
  expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  expect(paginate([], 14)).toEqual([])
})

test('worksheet settings: defaults, and unknown values fall back', () => {
  expect(DEFAULT_SETTINGS).toMatchObject({
    sheetScript: 'hiragana',
    sheetShuffle: false,
    sheetRomaji: true,
    sheetGrid: true,
    sheetColours: true,
    sheetFont: 'klee-one',
    sheetSize: 'medium',
  })
  const s = sanitizeSettings({
    sheetSize: 'huge',
    sheetScript: 'kanji',
    sheetRomaji: false,
    sheetFont: 'comic-sans',
  })
  expect(s.sheetSize).toBe('medium')
  expect(s.sheetScript).toBe('hiragana')
  expect(s.sheetRomaji).toBe(false)
  expect(s.sheetFont).toBe('klee-one')
  expect(sanitizeSettings({ sheetFont: 'strokes' }).sheetFont).toBe('strokes')
})
