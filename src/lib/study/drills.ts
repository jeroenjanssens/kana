import type { ConfusableSet } from '../data/confusables'
import { kanaById, kanaByChar, type Kana } from '../data/kana'
import type { DeckId } from '../storage/schema'
import type { Confusion } from './stats'

/** Sets built from the learner's own mix-ups (from typed and listening mistakes). */
export function personalSets(confusions: readonly Confusion[], min = 2): ConfusableSet[] {
  return confusions
    .filter((c) => c.count >= min)
    .map((c) => {
      const script = c.deck === 'katakana' || c.deck === 'listen-katakana' ? 'katakana' : 'hiragana'
      const chars = [c.shown, c.answered].map((id) => {
        const k = kanaById(id)
        return script === 'katakana' || !k.hiragana ? k.katakana : k.hiragana
      })
      return {
        id: `mine-${script}-${c.shown}-${c.answered}`,
        script,
        title: chars.join(' vs '),
        chars,
        hints: Object.fromEntries(
          chars.map((ch) => [
            ch,
            `You mixed these up ${c.count} times. Compare the shapes closely.`,
          ]),
        ),
      } satisfies ConfusableSet
    })
}

/** A quiz sequence of `n` characters from the set, balanced and never the same twice in a row. */
export function quizRounds(set: ConfusableSet, n = 12, rand = Math.random): string[] {
  const rounds: string[] = []
  let bag: string[] = []
  while (rounds.length < n) {
    if (!bag.length) bag = [...set.chars].sort(() => rand() - 0.5)
    const i = bag.findIndex((c) => c !== rounds.at(-1))
    const [next] = bag.splice(i === -1 ? 0 : i, 1)
    rounds.push(next)
  }
  return rounds
}

export interface QuizOption {
  label: string
  /** The kana this option stands for. */
  char: string
}

/**
 * Answer options for a set. Same-script sets are answered by romaji; mixed sets (e.g. へ/ヘ)
 * share a sound, so they are answered by script.
 */
export function quizOptions(set: ConfusableSet): QuizOption[] {
  if (set.script === 'mixed') {
    return set.chars.map((char) => ({
      char,
      label: kanaScript(char) === 'katakana' ? 'Katakana' : 'Hiragana',
    }))
  }
  return set.chars.map((char) => ({ char, label: kanaByChar(char)!.romaji }))
}

function kanaScript(char: string) {
  const code = char.codePointAt(0) ?? 0
  return code >= 0x30a0 ? 'katakana' : 'hiragana'
}

/** Which deck a drill answer is logged against, so stats include drill mistakes. */
export function drillDeck(set: ConfusableSet, char: string): DeckId {
  if (set.script === 'katakana') return 'katakana'
  if (set.script === 'hiragana') return 'hiragana'
  return kanaScript(char) === 'katakana' ? 'katakana' : 'hiragana'
}

export function kanaOf(char: string): Kana {
  const k = kanaByChar(char)
  if (!k) throw new Error(`Unknown kana: ${char}`)
  return k
}
