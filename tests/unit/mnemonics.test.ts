import { describe, expect, test } from 'vitest'
import { KANA, kanaById } from '../../src/lib/data/kana'
import { KANA_NOTES, hintParts, mnemonicFor, notesForKana } from '../../src/lib/data/mnemonics'

describe('memory hints', () => {
  test('every kana has a hint in each script it exists in', () => {
    for (const k of KANA) {
      if (k.hiragana) expect(mnemonicFor(k, 'hiragana'), k.id).not.toBe('')
      expect(mnemonicFor(k, 'katakana'), k.id).not.toBe('')
    }
  })

  test('basic kana have their own hints, different per script', () => {
    for (const k of KANA.filter((k) => k.group === 'basic')) {
      expect(mnemonicFor(k, 'hiragana')).not.toBe(mnemonicFor(k, 'katakana'))
    }
  })

  test('dakuten and handakuten hints refer to the base kana', () => {
    expect(mnemonicFor(kanaById('ga'), 'hiragana')).toContain('か ka')
    expect(mnemonicFor(kanaById('ga'), 'hiragana')).toContain('゛')
    expect(mnemonicFor(kanaById('pa'), 'katakana')).toContain('ハ ha')
    expect(mnemonicFor(kanaById('pa'), 'katakana')).toContain('゜')
  })

  test('yōon and extended hints explain the parts', () => {
    expect(mnemonicFor(kanaById('kya'), 'hiragana')).toBe(
      'き ki + a small ゃ ya → one syllable: kya.',
    )
    expect(mnemonicFor(kanaById('x-fa'), 'katakana')).toContain('フ fu + a small ァ a')
  })

  test('hintParts emphasises the starred sound', () => {
    expect(hintParts('a *ke*g on its side')).toEqual([
      { text: 'a ', em: false },
      { text: 'ke', em: true },
      { text: 'g on its side', em: false },
    ])
    for (const k of KANA.filter((k) => k.group === 'basic')) {
      const parts = hintParts(mnemonicFor(k, 'hiragana'))
      expect(
        parts.some((p) => p.em),
        k.id,
      ).toBe(true)
    }
  })
})

describe('kana notes', () => {
  test.each([
    ['ga', ['dakuten']],
    ['pa', ['handakuten']],
    ['kya', ['yoon']],
    ['ja', ['dakuten', 'yoon']],
    ['x-fa', ['small-vowel']],
    ['ka', []],
  ])('%s', (id, notes) => expect(notesForKana(kanaById(id))).toEqual(notes))

  test('every note has text', () => {
    for (const n of Object.values(KANA_NOTES)) expect(n.title && n.body && n.example).toBeTruthy()
  })
})
