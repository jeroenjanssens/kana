import { describe, expect, test } from 'vitest'
import { kanaById } from '../../src/lib/data/kana'
import {
  FAST_MS,
  SLOW_MS,
  checkKana,
  checkWord,
  kanaForAnswer,
  normalize,
  suggestGrade,
  wordAnswers,
} from '../../src/lib/study/answer'

describe('normalize', () => {
  test.each([
    ['  Shi ', 'shi'],
    ['KYA', 'kya'],
    ['kin-en', 'kinen'],
    ["kin'en", 'kinen'],
    ['gakkō', 'gakkou'],
    ['kōhī', 'kouhii'],
    ['o kaasan', 'okaasan'],
  ])('%s → %s', (input, out) => expect(normalize(input)).toBe(out))
})

describe('checkKana', () => {
  test('accepts Hepburn and Kunrei', () => {
    expect(checkKana(kanaById('shi'), 'shi')).toBe(true)
    expect(checkKana(kanaById('shi'), 'SI')).toBe(true)
    expect(checkKana(kanaById('tsu'), 'tu')).toBe(true)
    expect(checkKana(kanaById('fu'), 'hu')).toBe(true)
  })
  test('accepts wo and o for を', () => {
    expect(checkKana(kanaById('wo'), 'o')).toBe(true)
    expect(checkKana(kanaById('wo'), 'wo')).toBe(true)
  })
  test('accepts zu and du for づ', () => {
    expect(checkKana(kanaById('du'), 'zu')).toBe(true)
    expect(checkKana(kanaById('du'), 'du')).toBe(true)
  })
  test('rejects wrong answers', () => {
    expect(checkKana(kanaById('shi'), 'tsu')).toBe(false)
    expect(checkKana(kanaById('shi'), '')).toBe(false)
    expect(checkKana(kanaById('n'), 'm')).toBe(false)
  })
})

describe('checkWord', () => {
  const gakkou = { romaji: 'gakkō', accept: ['gakkou', 'gakko'] }
  test('accepts listed, macron and macron-free spellings', () => {
    expect(checkWord(gakkou, 'gakkou')).toBe(true)
    expect(checkWord(gakkou, 'gakkō')).toBe(true)
    expect(checkWord(gakkou, 'Gakko')).toBe(true)
    expect(checkWord(gakkou, 'gako')).toBe(false)
  })
  test('apostrophes are optional', () => {
    expect(checkWord({ romaji: "kin'en", accept: [] }, 'kinen')).toBe(true)
  })
  test('wordAnswers are unique and normalised', () => {
    expect(wordAnswers(gakkou)).toEqual(['gakkou', 'gakko'])
  })
})

describe('suggestGrade', () => {
  test('wrong is Again', () => expect(suggestGrade(false, 100)).toBe(1))
  test('fast is Easy', () => expect(suggestGrade(true, FAST_MS)).toBe(4))
  test('normal is Good', () => expect(suggestGrade(true, FAST_MS + 1)).toBe(3))
  test('slow is Hard', () => expect(suggestGrade(true, SLOW_MS + 1)).toBe(2))
})

describe('kanaForAnswer', () => {
  const pool = [kanaById('shi'), kanaById('tsu'), kanaById('n')]
  test('finds the kana that was typed', () => {
    expect(kanaForAnswer('tsu', pool)?.id).toBe('tsu')
    expect(kanaForAnswer('si', pool)?.id).toBe('shi')
  })
  test('returns undefined for unknown or empty answers', () => {
    expect(kanaForAnswer('xyz', pool)).toBeUndefined()
    expect(kanaForAnswer('  ', pool)).toBeUndefined()
  })
})
