import type { Kana, Script } from '../data/kana'

/** Which script(s) a sprint or race asks in. With 'both', each question is in one of the two. */
export type ScriptChoice = Script | 'both'
export const SCRIPT_CHOICES: readonly ScriptChoice[] = ['hiragana', 'katakana', 'both']

export function scriptsOf(choice: ScriptChoice): Script[] {
  return choice === 'both' ? ['hiragana', 'katakana'] : [choice]
}

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
  return [...new Set(questions.map((q) => q.kana))]
}
