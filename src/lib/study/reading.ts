import { kanaByChar, segment, type Kana } from '../data/kana'
import { words, type Word, type WordTag } from '../data/words'
import { atLeast, masteryLevel, type MasteryLevel } from '../srs/scheduler'
import type { SaveFile } from '../storage/schema'

/** The kana a word is built from (っ, ー and other marks are skipped). */
export function wordKana(word: Pick<Word, 'kana'>): Kana[] {
  return segment(word.kana).flatMap(({ text, kana }) => {
    if (!kana) return []
    // Extended katakana (ファ, ティ…) count as known when their base kana is known.
    if (kana.group === 'extended') {
      const base = kanaByChar([...text][0])
      return base ? [base] : []
    }
    return [kana]
  })
}

/** Best mastery of a kana for a script, across the single-script and combined decks. */
export function knownLevel(save: SaveFile, kana: Kana, script: Word['script']): MasteryLevel {
  const own = masteryLevel(save.cards[script]?.[kana.id])
  const combined = masteryLevel(save.cards.combined?.[kana.id])
  return atLeast(own, combined) ? own : combined
}

export function isUnlocked(save: SaveFile, word: Word, min: MasteryLevel = 'young'): boolean {
  return wordKana(word).every((k) => atLeast(knownLevel(save, k, word.script), min))
}

export function unlockedWords(save: SaveFile, list: readonly Word[] = words): Word[] {
  return list.filter((w) => isUnlocked(save, w))
}

/** How many more kana you need to know to unlock this word. */
export function missingKana(save: SaveFile, word: Word): Kana[] {
  const seen = new Set<string>()
  return wordKana(word).filter((k) => {
    if (seen.has(k.id) || atLeast(knownLevel(save, k, word.script), 'young')) return false
    seen.add(k.id)
    return true
  })
}

export interface ReadingNote {
  id: WordTag
  title: string
  body: string
  example: string
}

/** Short explanations of spelling rules, shown the first time a word uses them. */
export const NOTES: Partial<Record<WordTag, ReadingNote>> = {
  sokuon: {
    id: 'sokuon',
    title: 'Small っ doubles the next consonant',
    body: 'A small っ (ッ in katakana) is not pronounced as "tsu". It makes a short pause and doubles the consonant that follows.',
    example: 'がっこう → gakkō, ねっこ → nekko',
  },
  choon: {
    id: 'choon',
    title: 'ー makes a vowel long',
    body: 'In katakana, the long dash ー stretches the vowel before it to about twice its length.',
    example: 'コーヒー → kōhī, ケーキ → kēki',
  },
  'long-vowel': {
    id: 'long-vowel',
    title: 'Long vowels in hiragana',
    body: 'In hiragana, a vowel is made long by adding another vowel: あ, い or う after the same vowel, い after e, and usually う after o.',
    example: 'おかあさん → okāsan, せんせい → sensē, がっこう → gakkō',
  },
  yoon: {
    id: 'yoon',
    title: 'Small ゃ ゅ ょ blend into one sound',
    body: 'A small ゃ, ゅ or ょ after an i-row kana merges with it into a single syllable.',
    example: 'き + ゃ → きゃ (kya), し + ょ → しょ (sho)',
  },
}

export function notesFor(word: Word): ReadingNote[] {
  return word.tags.flatMap((t) => (NOTES[t] ? [NOTES[t]!] : []))
}

/** Unlocked words ordered for practice: least practised and least recently seen first. */
export function practiceOrder(save: SaveFile, list: readonly Word[], rand = Math.random): Word[] {
  return [...list]
    .map((w) => {
      const p = save.words[w.kana]
      const accuracy = p && p.seen ? p.correct / p.seen : 0
      return { w, score: (p?.seen ?? 0) * 0.5 + accuracy * 2 + rand() * 1.5 }
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.w)
}
