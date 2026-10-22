import type { Lang } from '../i18n/format'
import { kanaByChar, segment, type Kana } from '../data/kana'
import { meaningsNl } from '../data/nl/words'
import { words, type Word } from '../data/words'
import { atLeast, masteryLevel, type MasteryLevel } from '../srs/queue'
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

export function wordMeaning(word: Word, lang: Lang = 'en'): string {
  return (lang === 'nl' && meaningsNl[word.kana]) || word.meaning
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
