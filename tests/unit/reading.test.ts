import { describe, expect, test } from 'vitest'
import { kanaByChar, scriptOf } from '../../src/lib/data/kana'
import { macronVariants, romajiVariants } from '../../src/lib/data/romaji'
import { build, words, type Word } from '../../src/lib/data/words'
import { normalize } from '../../src/lib/study/answer'
import {
  glyphsText,
  inScript,
  isUnlocked,
  knownLevel,
  missingKana,
  ofKind,
  practiceOrder,
  unlockedWords,
  wordKana,
  wordSize,
  wordText,
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
  rules: Word['rules'] = [],
): Word => ({
  kana,
  parts: [kana],
  kind: 'word',
  romaji: '',
  accept: [],
  meaning: '',
  index: 0,
  script,
  rules,
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
    expect(w.parts.join('')).toBe(w.kana)
    const partScripts = new Set<string>()
    for (const part of w.parts) {
      const script = scriptOf([...part].find((c) => scriptOf(c) === 'katakana') ?? part[0])
      partScripts.add(script!)
      for (const c of part) {
        const known = kanaByChar(c) !== undefined || 'っッーャュョゃゅょァィゥェォ'.includes(c)
        expect(known, `${w.kana}: ${c}`).toBe(true)
        expect(scriptOf(c), `${w.kana}: ${c}`).toBe(script)
      }
    }
    expect(w.script).toBe(partScripts.size > 1 ? 'mixed' : [...partScripts][0])
    if (w.kind === 'phrase') {
      expect(w.parts.length).toBeGreaterThanOrEqual(2)
      expect(w.parts.length).toBeLessThanOrEqual(5)
      expect(w.romaji.split(' ')).toHaveLength(w.parts.length)
    } else {
      expect(w.parts).toHaveLength(1)
      expect(w.romaji).not.toContain(' ')
    }
    expect(w.romaji).toBeTruthy()
    expect(w.meaning).toBeTruthy()
    expect(w.accept.length).toBeGreaterThan(0)
    for (const a of w.accept) expect(a).toMatch(/^[a-z]+$/)
    expect(w.rules.includes('sokuon')).toBe(w.parts.some((p) => /[っッ]./.test(p)))
    expect(w.rules.includes('choon')).toBe(w.kana.includes('ー'))
    expect(w.rules.includes('yoon')).toBe(/[ゃゅょャュョ]/.test(w.kana))
    // Every word is made of kana we can teach.
    expect(wordKana(w).length).toBeGreaterThan(0)
    // The plain spelling of the romaji is accepted.
    expect(w.accept.map(normalize)).toContain(normalize(w.accept[0]))
  })

  test.each(words.map((w) => [w.kana, w] as const))('%s: romaji matches the kana', (_, w) => {
    // A particle は at the end (こんにちは) is said wa.
    const spoken = w.rules.includes('particles') ? w.kana.replace(/は$/, 'わ') : w.kana
    const fromKana = romajiVariants(spoken)
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
    expect(missingKana(save, neko).map((k) => k.kana.id)).toEqual(['ko'])
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

describe('order', () => {
  test('practiceOrder puts unpractised words first', () => {
    const save = emptySave()
    save.words['あい'] = { seen: 10, correct: 10, last: 1 }
    const order = practiceOrder(save, [word('あい'), word('いえ')], () => 0)
    expect(order.map((w) => w.kana)).toEqual(['いえ', 'あい'])
  })
})

describe('wordSize', () => {
  test('is as large as allowed, smaller for long words', () => {
    expect(wordSize('あい', '5rem')).toBe('min(5rem, calc(92cqi / 2))')
    expect(wordSize('アイスクリーム', '5rem')).toBe('min(5rem, calc(92cqi / 7))')
  })

  test('counts characters, not UTF-16 code units', () => {
    expect(wordSize('ヴァイオリン', '2rem')).toBe('min(2rem, calc(92cqi / 6))')
  })
})

describe('phrases', () => {
  const toilet = build(
    ['トイレ は どこ です か', 'toire wa doko desu ka', 'where is the toilet?'],
    0,
  )
  const kore = build(['これ を ください', 'kore o kudasai', 'this one, please'], 1)

  test('are written without spaces, with their words kept apart', () => {
    expect(toilet).toMatchObject({
      kana: 'トイレはどこですか',
      parts: ['トイレ', 'は', 'どこ', 'です', 'か'],
      kind: 'phrase',
      script: 'mixed',
    })
    expect(kore.script).toBe('hiragana')
    expect(wordText(toilet, true)).toBe('トイレ は どこ です か')
    expect(wordText(toilet, false)).toBe('トイレはどこですか')
  })

  test('は, へ and を on their own are particles: said wa, e and o', () => {
    expect(toilet.rules).toContain('particles')
    expect(kore.rules).toContain('particles')
    expect(toilet.accept).toContain('toirewadokodesuka')
    expect(toilet.accept).not.toContain('toirehadokodesuka')
    expect(kore.accept).toContain('koreokudasai')
    expect(kore.accept).not.toContain('korewokudasai')
    // Inside a word は is just ha.
    expect(build(['はな', 'hana', 'flower'], 0).rules).not.toContain('particles')
  })

  test('rules are found word by word, each in its own script', () => {
    expect(toilet.rules).toContain('r')
    expect(toilet.rules).toContain('devoicing')
    // The long-vowel rule is for hiragana; トイレ's katakana doesn't trigger hiragana-only rules.
    expect(
      build(['コーヒー を ください', 'kōhī o kudasai', 'a coffee, please'], 0).rules,
    ).not.toContain('long-vowel')
  })

  test('unlock with each kana in its own script', () => {
    const save = emptySave()
    const known = (script: 'hiragana' | 'katakana', ids: string[]) => {
      save.cards[script] = {
        ...save.cards[script],
        ...Object.fromEntries(ids.map((id) => [id, young()])),
      }
    }
    known('hiragana', ['ha', 'do', 'ko', 'de', 'su', 'ka'])
    expect(isUnlocked(save, toilet)).toBe(false)
    expect(glyphsText(missingKana(save, toilet))).toBe('ト イ レ')
    // In hiragana they don't count.
    known('hiragana', ['to', 'i', 're'])
    expect(isUnlocked(save, toilet)).toBe(false)
    known('katakana', ['to', 'i', 're'])
    expect(isUnlocked(save, toilet)).toBe(true)
  })

  test('mixed phrases only come up with both scripts', () => {
    expect(inScript(toilet, 'hiragana')).toBe(false)
    expect(inScript(toilet, 'katakana')).toBe(false)
    expect(inScript(toilet, 'both')).toBe(true)
    expect(inScript(kore, 'hiragana')).toBe(true)
  })

  test('words, phrases, or both', () => {
    const neko = build(['ねこ', 'neko', 'cat'], 0)
    expect([ofKind(neko, 'words'), ofKind(neko, 'phrases'), ofKind(neko, 'both')]).toEqual([
      true,
      false,
      true,
    ])
    expect([ofKind(kore, 'words'), ofKind(kore, 'phrases'), ofKind(kore, 'both')]).toEqual([
      false,
      true,
      true,
    ])
  })
})
