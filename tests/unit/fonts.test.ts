import { existsSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { subsetText } from '../../scripts/subset-fonts'
import { KANA } from '../../src/lib/data/kana'
import {
  DEFAULT_FONT_ID,
  FONTS,
  SYSTEM_FONT_STACK,
  fontById,
  fontFamily,
  fontUrl,
  randomFontId,
} from '../../src/lib/data/fonts'

describe('font catalogue', () => {
  test('ids and families are unique', () => {
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length)
    expect(new Set(FONTS.map((f) => f.family)).size).toBe(FONTS.length)
  })

  test('every font has a subset and a license in public/fonts', () => {
    for (const font of FONTS) {
      expect(existsSync(`public/fonts/${font.id}.woff2`), font.id).toBe(true)
      expect(existsSync(`public/fonts/licenses/${font.id}.txt`), font.id).toBe(true)
    }
  })

  test('the default font exists', () => {
    expect(fontById(DEFAULT_FONT_ID)).toBeDefined()
  })

  test('fontFamily falls back to the system stack', () => {
    expect(fontFamily('klee-one')).toBe(`"Kana Klee One", ${SYSTEM_FONT_STACK}`)
    expect(fontFamily('system')).toBe(SYSTEM_FONT_STACK)
  })

  test('fontUrl uses the base path', () => {
    expect(fontUrl(fontById('yomogi')!, '/kana/')).toBe('/kana/fonts/yomogi.woff2')
  })
})

describe('randomFontId', () => {
  test('never repeats the previous font when there is a choice', () => {
    for (let i = 0; i < 50; i++) {
      expect(randomFontId(['a', 'b'], 'a')).toBe('b')
    }
  })

  test('uses the only font when one is enabled', () => {
    expect(randomFontId(['a'], 'a')).toBe('a')
  })

  test('falls back to the default font when none are enabled', () => {
    expect(randomFontId([])).toBe(DEFAULT_FONT_ID)
  })

  test('is deterministic with an injected random source', () => {
    expect(randomFontId(['a', 'b', 'c'], undefined, () => 0.99)).toBe('c')
  })
})

describe('subset text', () => {
  test('covers every kana glyph', () => {
    const text = subsetText()
    for (const k of KANA) {
      for (const c of k.hiragana + k.katakana) expect(text).toContain(c)
    }
    expect(text).toContain('ー')
    expect(text).toContain('っ')
  })
})
