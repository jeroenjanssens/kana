import { acceptedAnswers, type Kana } from '../data/kana'
import type { Grade } from '../storage/schema'

const MACRONS: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou' }

/** Lowercase, trim, drop spaces/hyphens/apostrophes and spell out macrons. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFC')
    .replace(/[āīūēō]/g, (c) => MACRONS[c])
    .replace(/[\s'’\-.]/g, '')
}

export function checkKana(kana: Kana, input: string): boolean {
  const answer = normalize(input)
  return acceptedAnswers(kana).some((a) => normalize(a) === answer)
}

/** Accepted spellings for a word: its explicit list plus its romaji with and without macrons. */
export function wordAnswers(word: { romaji: string; accept: readonly string[] }): string[] {
  const plain = word.romaji.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return [...new Set([...word.accept, word.romaji, plain].map(normalize))]
}

export function checkWord(word: { romaji: string; accept: readonly string[] }, input: string) {
  return wordAnswers(word).includes(normalize(input))
}

/** Thresholds for suggesting a grade from response time (typed answers). */
export const FAST_MS = 2000
export const SLOW_MS = 6000

/** Suggest an SRS grade from correctness and response time. */
export function suggestGrade(correct: boolean, ms: number): Grade {
  if (!correct) return 1
  if (ms <= FAST_MS) return 4
  if (ms <= SLOW_MS) return 3
  return 2
}

export const GRADE_LABELS: Record<Grade, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }

/** The kana (from `pool`) whose romaji matches what was typed, for the confusion stats. */
export function kanaForAnswer(input: string, pool: readonly Kana[]): Kana | undefined {
  const answer = normalize(input)
  if (!answer) return undefined
  return pool.find((k) => acceptedAnswers(k).some((a) => normalize(a) === answer))
}
