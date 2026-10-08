import { describe, expect, test } from 'vitest'
import { kanaByChar, scriptOf } from '../../src/lib/data/kana'
import { macronVariants, romajiVariants } from '../../src/lib/data/romaji'
import { words, type Word } from '../../src/lib/data/words'
import { normalize } from '../../src/lib/study/answer'
import {
  NOTES,
  isUnlocked,
  knownLevel,
  missingKana,
  notesFor,
  practiceOrder,
  unlockedWords,
  wordKana,
} from '../../src/lib/study/reading'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'

const DAY = 86_400_000
const young = (days = 4): CardRecord => ({
  due: Date.now() + days * DAY,
  stability: 5,
  difficulty: 5,
  elapsed_days: 0,
  scheduled_days: days,
  learning_steps: 0,
  reps: 3,
  lapses: 0,
  state: 2,
})

const word = (
  kana: string,
  script: Word['script'] = 'hiragana',
  tags: Word['tags'] = [],
): Word => ({
  kana,
  romaji: '',
  accept: [],
  meaning: '',
  script,
  tags,
})

describe('word list', () => {
  test('has around 300 words with a good mix', () => {
    expect(words.length).toBeGreaterThanOrEqual(250)
    expect(words.filter((w) => w.script === 'katakana').length).toBeGreaterThanOrEqual(80)
  })

  test('has no duplicates', () => {
    expect(new Set(words.map((w) => w.kana)).size).toBe(words.length)
  })

  test.each(words.map((w) => [w.kana, w] as const))('%s is valid', (_, w) => {
    for (const c of w.kana) {
      const known = kanaByChar(c) !== undefined || 'っッーャュョゃゅょァィゥェォ'.includes(c)
      expect(known, `${w.kana}: ${c}`).toBe(true)
      expect(scriptOf(c), `${w.kana}: ${c}`).toBe(w.script)
    }
    expect(w.romaji).toBeTruthy()
    expect(w.meaning).toBeTruthy()
    expect(w.accept.length).toBeGreaterThan(0)
    for (const a of w.accept) expect(a).toMatch(/^[a-z]+$/)
    expect(w.tags.includes('sokuon')).toBe(/[っッ]/.test(w.kana))
    expect(w.tags.includes('choon')).toBe(w.kana.includes('ー'))
    expect(w.tags.includes('loanword')).toBe(w.script === 'katakana')
    expect(w.tags.includes('yoon')).toBe(/[ゃゅょャュョ]/.test(w.kana))
    // Every word is made of kana we can teach.
    expect(wordKana(w).length).toBeGreaterThan(0)
    // The plain spelling of the romaji is accepted.
    expect(w.accept.map(normalize)).toContain(normalize(w.accept[0]))
  })

  test.each(words.map((w) => [w.kana, w] as const))('%s: romaji matches the kana', (_, w) => {
    const fromKana = romajiVariants(w.kana)
    expect(
      macronVariants(w.romaji).some((v) => fromKana.includes(v)),
      `${w.kana} ≠ ${w.romaji}`,
    ).toBe(true)
  })

  test('there are plenty of first words using only the first five rows', () => {
    const early = /^[あいうえおかきくけこさしすせそたちつてとなにぬねの]+$/
    expect(words.filter((w) => early.test(w.kana)).length).toBeGreaterThanOrEqual(30)
  })
})

describe('wordKana', () => {
  test('splits into kana and skips marks', () => {
    expect(wordKana(word('がっこう')).map((k) => k.id)).toEqual(['ga', 'ko', 'u'])
    expect(wordKana(word('コーヒー', 'katakana')).map((k) => k.id)).toEqual(['ko', 'hi'])
    expect(wordKana(word('しゃしん')).map((k) => k.id)).toEqual(['sha', 'shi', 'n'])
  })
  test('extended katakana count as their base kana', () => {
    expect(wordKana(word('フォーク', 'katakana')).map((k) => k.id)).toEqual(['fu', 'ku'])
  })
})

describe('unlocking', () => {
  test('a word unlocks when all its kana are young in its script', () => {
    const save = emptySave()
    const neko = word('ねこ')
    expect(isUnlocked(save, neko)).toBe(false)
    save.cards.hiragana = { ne: young() }
    expect(missingKana(save, neko).map((k) => k.id)).toEqual(['ko'])
    save.cards.hiragana.ko = young()
    expect(isUnlocked(save, neko)).toBe(true)
  })

  test('katakana words need the katakana deck', () => {
    const save = emptySave()
    save.cards.hiragana = { ke: young(), ki: young() }
    expect(isUnlocked(save, word('ケーキ', 'katakana'))).toBe(false)
    save.cards.katakana = { ke: young(), ki: young() }
    expect(isUnlocked(save, word('ケーキ', 'katakana'))).toBe(true)
  })

  test('the combined deck counts for both scripts', () => {
    const save = emptySave()
    save.cards.combined = { a: young(), i: young() }
    expect(knownLevel(save, kanaByChar('あ')!, 'katakana')).toBe('young')
    expect(isUnlocked(save, word('あい'))).toBe(true)
  })

  test('unlockedWords filters a list', () => {
    const save = emptySave()
    save.cards.hiragana = { a: young(), i: young() }
    expect(unlockedWords(save, [word('あい'), word('いえ')]).map((w) => w.kana)).toEqual(['あい'])
  })

  test('learning the first two rows unlocks some real words', () => {
    const save = emptySave()
    save.cards.hiragana = Object.fromEntries(
      ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'].map((id) => [id, young()]),
    )
    expect(unlockedWords(save).length).toBeGreaterThan(0)
  })
})

describe('notes and order', () => {
  test('notes are shown for special spellings', () => {
    expect(
      notesFor(word('がっこう', 'hiragana', ['sokuon', 'long-vowel', 'dakuten'])).map((n) => n.id),
    ).toEqual(['sokuon', 'long-vowel'])
    expect(Object.keys(NOTES)).toEqual(['sokuon', 'choon', 'long-vowel', 'yoon'])
  })

  test('practiceOrder puts unpractised words first', () => {
    const save = emptySave()
    save.words['あい'] = { seen: 10, correct: 10, last: 1 }
    const order = practiceOrder(save, [word('あい'), word('いえ')], () => 0)
    expect(order.map((w) => w.kana)).toEqual(['いえ', 'あい'])
  })
})
