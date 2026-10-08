import { describe, expect, test } from 'vitest'
import {
  KANA,
  acceptedAnswers,
  displayRomaji,
  kanaByChar,
  kanaById,
  kanaInGroups,
  rowsOf,
  scriptOf,
  segment,
} from '../../src/lib/data/kana'

const count = (group: string) => KANA.filter((k) => k.group === group).length

describe('kana dataset', () => {
  test('has the expected number of kana per group', () => {
    expect(count('basic')).toBe(46)
    expect(count('dakuten')).toBe(25)
    expect(count('yoon')).toBe(33)
    expect(count('extended')).toBe(19)
  })

  test('ids are unique', () => {
    const ids = KANA.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('glyphs are unique within each script', () => {
    const hira = KANA.filter((k) => k.hiragana).map((k) => k.hiragana)
    const kata = KANA.map((k) => k.katakana)
    expect(new Set(hira).size).toBe(hira.length)
    expect(new Set(kata).size).toBe(kata.length)
  })

  test('order is sequential', () => {
    KANA.forEach((k, i) => expect(k.order).toBe(i))
  })

  test('hiragana and katakana are in the right Unicode blocks', () => {
    for (const k of KANA) {
      for (const c of k.hiragana) expect(scriptOf(c)).toBe('hiragana')
      for (const c of k.katakana) expect(scriptOf(c)).toBe('katakana')
    }
  })

  test('hiragana and katakana forms correspond (offset 0x60)', () => {
    for (const k of KANA.filter((k) => k.hiragana)) {
      const shifted = [...k.hiragana].map((c) => String.fromCodePoint(c.codePointAt(0)! + 0x60))
      expect(shifted.join('')).toBe(k.katakana)
    }
  })

  test('only basic and dakuten kana have audio', () => {
    expect(KANA.filter((k) => k.audio)).toHaveLength(71)
    for (const k of KANA) expect(k.audio).toBe(k.group === 'basic' || k.group === 'dakuten')
  })

  test('columns are within range', () => {
    for (const k of KANA) {
      expect(k.col).toBeGreaterThanOrEqual(0)
      expect(k.col).toBeLessThan(k.group === 'yoon' ? 3 : 5)
    }
  })
})

describe('romanisation', () => {
  test.each([
    ['shi', 'shi', 'si'],
    ['chi', 'chi', 'ti'],
    ['tsu', 'tsu', 'tu'],
    ['fu', 'fu', 'hu'],
    ['ji', 'ji', 'zi'],
    ['sha', 'sha', 'sya'],
    ['cho', 'cho', 'tyo'],
    ['ja', 'ja', 'zya'],
    ['ka', 'ka', 'ka'],
  ])('%s → hepburn %s, kunrei %s', (id, hepburn, kunrei) => {
    const k = kanaById(id)
    expect(k.romaji).toBe(hepburn)
    expect(k.kunrei).toBe(kunrei)
  })

  test('を is romanised as o and labelled', () => {
    const wo = kanaByChar('を')!
    expect(wo.romaji).toBe('o')
    expect(displayRomaji(wo)).toBe('o (wo)')
    expect(acceptedAnswers(wo)).toEqual(expect.arrayContaining(['o', 'wo']))
  })

  test('ぢ and づ have distinct ids but sound like じ and ず', () => {
    expect(kanaByChar('ぢ')!.id).toBe('di')
    expect(kanaByChar('ぢ')!.romaji).toBe('ji')
    expect(kanaByChar('づ')!.id).toBe('du')
    expect(kanaByChar('づ')!.romaji).toBe('zu')
    expect(acceptedAnswers(kanaByChar('づ')!)).toEqual(expect.arrayContaining(['zu', 'du']))
  })

  test('accepted answers include kunrei and alternatives', () => {
    expect(acceptedAnswers(kanaById('shi'))).toEqual(['shi', 'si'])
    expect(acceptedAnswers(kanaById('n'))).toEqual(['n', 'nn'])
    expect(acceptedAnswers(kanaById('ja'))).toEqual(expect.arrayContaining(['ja', 'zya', 'jya']))
  })

  test('kunrei display', () => {
    expect(displayRomaji(kanaById('shi'), 'kunrei')).toBe('si')
  })
})

describe('lookup helpers', () => {
  test('kanaById throws on unknown id', () => {
    expect(() => kanaById('xyz')).toThrow()
  })

  test('kanaByChar finds both scripts', () => {
    expect(kanaByChar('し')?.id).toBe('shi')
    expect(kanaByChar('シ')?.id).toBe('shi')
    expect(kanaByChar('きゃ')?.id).toBe('kya')
    expect(kanaByChar('ファ')?.id).toBe('x-fa')
    expect(kanaByChar('x')).toBeUndefined()
  })

  test('kanaInGroups excludes katakana-only kana for hiragana', () => {
    expect(kanaInGroups(['basic', 'extended'], 'hiragana')).toHaveLength(46)
    expect(kanaInGroups(['basic', 'extended'], 'katakana')).toHaveLength(65)
  })

  test('rowsOf returns rows in order', () => {
    const rows = rowsOf('basic')
    expect(rows.map((r) => r.row)).toEqual(['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'nn'])
    expect(rows[7].kana.map((k) => k.id)).toEqual(['ya', 'yu', 'yo'])
  })

  test('segment splits yōon, extended and unknown characters', () => {
    expect(segment('きょうと').map((s) => s.text)).toEqual(['きょ', 'う', 'と'])
    expect(segment('コーヒー').map((s) => s.kana?.id ?? s.text)).toEqual(['ko', 'ー', 'hi', 'ー'])
    expect(segment('がっこう').map((s) => s.kana?.id ?? s.text)).toEqual(['ga', 'っ', 'ko', 'u'])
    expect(segment('フォーク').map((s) => s.kana?.id ?? s.text)).toEqual(['x-fo', 'ー', 'ku'])
  })
})
