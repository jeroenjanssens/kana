import { describe, expect, test } from 'vitest'
import { KANA, kanaById } from '../../src/lib/data/kana'
import {
  KANA_NOTES,
  hintParagraphs,
  hintParts,
  mnemonicFor,
  notesForKana,
} from '../../src/lib/data/mnemonics'

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

describe('Tofugu hints', () => {
  test('hiragana hints are the book’s, in paragraphs', () => {
    expect(hintParagraphs(mnemonicFor(kanaById('a'), 'hiragana'))).toEqual([
      'Look closely, and find the letter *A* inside of it.',
      'There is another similar hiragana, お, but that one doesn’t have an *A* in it, which is how you can differentiate them.',
    ])
    expect(hintParagraphs(mnemonicFor(kanaById('ne'), 'hiragana'))).toHaveLength(3)
    expect(hintParagraphs(mnemonicFor(kanaById('ka'), 'katakana'))).toHaveLength(1)
  })

  test('a kana in braces is shown in a textbook font', () => {
    expect(hintParts('For example: {き}.')).toEqual([
      { text: 'For example: ', em: false },
      { text: 'き', em: false, textbook: true },
      { text: '.', em: false },
    ])
  })

  test('katakana hints are the book’s too', () => {
    expect(mnemonicFor(kanaById('ku'), 'katakana')).toBe(
      'This looks like a long *coo*k’s hat. What are they hiding under there?!',
    )
  })

  test('no paragraph is empty and braces only hold kana', () => {
    for (const k of KANA.filter((k) => k.group === 'basic')) {
      for (const [lang, script] of [
        ['en', 'hiragana'],
        ['en', 'katakana'],
        ['nl', 'hiragana'],
        ['nl', 'katakana'],
      ] as const) {
        const hint = mnemonicFor(k, script, lang)
        for (const p of hintParagraphs(hint))
          expect(p.trim(), `${k.id} ${lang} ${script}`).not.toBe('')
        for (const m of hint.matchAll(/\{([^}]*)\}/g)) expect(m[1]).toMatch(/^[\u3040-\u30ff]+$/)
      }
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
