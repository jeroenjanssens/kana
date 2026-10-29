import type { Lang } from '../i18n/format'
import { kanaByChar, scriptOf, segment, type Kana, type Script } from '../data/kana'
import { meaningsNl } from '../data/nl/words'
import { words, type Word } from '../data/words'
import { atLeast, masteryLevel, type MasteryLevel } from '../srs/queue'
import type { SaveFile } from '../storage/schema'
import type { ReadingKind, ScriptChoice } from './scripts'

/** Cards in a round of reading practice; 0 is no limit. */
export const READING_COUNTS = [10, 15, 25, 50, 0] as const

/** The chosen number of cards per round, or the default for anything else. */
export function readingCount(n: number): number {
  return (READING_COUNTS as readonly number[]).includes(n) ? n : 15
}

/** Whether a word is in the chosen script(s): a phrase that mixes them only with 'both'. */
export function inScript(word: Pick<Word, 'script'>, choice: ScriptChoice): boolean {
  return choice === 'both' || word.script === choice
}

export function ofKind(word: Pick<Word, 'kind'>, choice: ReadingKind): boolean {
  return choice === 'both' || (choice === 'words') === (word.kind === 'word')
}

/** How a word is shown: a phrase with or without spaces between its words. */
export function wordText(word: Pick<Word, 'parts'>, spaces: boolean): string {
  return word.parts.join(spaces ? ' ' : '')
}

/** How many of these words are due and how many are new (never practised). */
export function wordCounts(save: SaveFile, list: readonly Word[], now = Date.now()) {
  let due = 0
  let fresh = 0
  for (const w of list) {
    const card = save.words[w.kana]?.card
    if (!card || card.state === 0) fresh++
    else if (card.due <= now) due++
  }
  return { due, new: fresh }
}

/** A kana as it's written in a word: in that word's script. */
export interface WordKana {
  kana: Kana
  script: Script
}

/** The kana a word is built from, each in its own script (っ, ー and other marks are skipped). */
export function wordGlyphs(word: Pick<Word, 'kana'>): WordKana[] {
  return segment(word.kana).flatMap(({ text, kana }) => {
    if (!kana) return []
    const script = scriptOf([...text][0]) ?? 'hiragana'
    // Extended katakana (ファ, ティ…) count as known when their base kana is known.
    if (kana.group === 'extended') {
      const base = kanaByChar([...text][0])
      return base ? [{ kana: base, script }] : []
    }
    return [{ kana, script }]
  })
}

/** The kana a word is built from (っ, ー and other marks are skipped). */
export function wordKana(word: Pick<Word, 'kana'>): Kana[] {
  return wordGlyphs(word).map((g) => g.kana)
}

/** Best mastery of a kana for a script, across the single-script and combined decks. */
export function knownLevel(save: SaveFile, kana: Kana, script: Script): MasteryLevel {
  const own = masteryLevel(save.cards[script]?.[kana.id])
  const combined = masteryLevel(save.cards.combined?.[kana.id])
  return atLeast(own, combined) ? own : combined
}

export function isUnlocked(
  save: SaveFile,
  word: Pick<Word, 'kana'>,
  min: MasteryLevel = 'young',
): boolean {
  return wordGlyphs(word).every((g) => atLeast(knownLevel(save, g.kana, g.script), min))
}

export function unlockedWords(save: SaveFile, list: readonly Word[] = words): Word[] {
  return list.filter((w) => isUnlocked(save, w))
}

/** The kana you still need to know to unlock this word, each once, in its script. */
export function missingKana(save: SaveFile, word: Pick<Word, 'kana'>): WordKana[] {
  const seen = new Set<string>()
  return wordGlyphs(word).filter((g) => {
    const key = `${g.script}:${g.kana.id}`
    if (seen.has(key) || atLeast(knownLevel(save, g.kana, g.script), 'young')) return false
    seen.add(key)
    return true
  })
}

/** Missing kana as they're written: か き ア. */
export function glyphsText(list: readonly WordKana[]): string {
  return list.map((g) => (g.script === 'katakana' ? g.kana.katakana : g.kana.hiragana)).join(' ')
}

/**
 * A font size that fits a word on one line of its container (a size container, see PaperCard):
 * as large as `max`, smaller when the word has too many characters for the width.
 */
export function wordSize(text: string, max: string): string {
  const n = Math.max(1, [...text].length)
  return `min(${max}, calc(92cqi / ${n}))`
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
