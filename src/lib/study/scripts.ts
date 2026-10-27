import type { Kana, Script } from '../data/kana'

/** Which script(s) a sprint or race asks in. With 'both', each question is in one of the two. */
export type ScriptChoice = Script | 'both'
export const SCRIPT_CHOICES: readonly ScriptChoice[] = ['hiragana', 'katakana', 'both']

export function scriptsOf(choice: ScriptChoice): Script[] {
  return choice === 'both' ? ['hiragana', 'katakana'] : [choice]
}

/** Which kana a race goes through. */
export type RaceKana = 'seen' | 'mastered' | 'all' | 'rows'
export const RACE_KANA: readonly RaceKana[] = ['seen', 'mastered', 'all', 'rows']

/** The size of the squares on a printed worksheet. */
export type SheetSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
export const SHEET_SIZES: readonly SheetSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge']
/** The worksheet "font" that draws kana from the stroke-order data, like the numbered square. */
export const SHEET_STROKES = 'strokes'

/** A kana as it's asked: in one script. */
export interface Question {
  kana: Kana
  script: Script
}

/** `hiragana:ka`: the same kana in the other script is a different question. */
export function questionKey(q: Question): string {
  return `${q.script}:${q.kana.id}`
}

/** The kana in a list of questions, each once (for answer buttons). */
export function kanaOf(questions: readonly Question[]): Kana[] {
  return [...new Map(questions.map((q) => [q.kana.id, q.kana])).values()]
}
