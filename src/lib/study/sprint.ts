import { KANA, acceptedAnswers, kanaInGroups, type Kana, type Script } from '../data/kana'
import type { SaveFile, SprintResult } from '../storage/schema'
import { normalize } from './answer'
import { questionKey, scriptsOf, type Question, type ScriptChoice } from './scripts'

/** The lengths a sprint can have, in minutes. */
export const SPRINT_MINUTES = [1, 2, 3, 5] as const
/** A wrong answer costs this much time. */
export const PENALTY_MS = 2000
const MIN_POOL = 10
const KEEP = 50

export type Judgement = 'correct' | 'wrong' | 'pending'

/** Every accepted spelling of every kana, for telling what a wrong answer is turning into. */
const ALL_ANSWERS = [...new Set(KANA.flatMap((k) => acceptedAnswers(k).map(normalize)))]

/**
 * Judge romaji while it's being typed: correct as soon as it matches an accepted spelling, pending
 * while it can still become one. A wrong answer waits until it's another whole kana nothing longer
 * starts with ("tsu", "a") or can't become any kana ("nk"), so a mistake records what was meant.
 * A wrong first letter always waits for a second one. No Enter needed.
 */
export function judge(input: string, kana: Kana): Judgement {
  const typed = normalize(input)
  if (!typed) return 'pending'
  const answers = acceptedAnswers(kana).map(normalize)
  if (answers.includes(typed)) return 'correct'
  if (answers.some((a) => a.startsWith(typed))) return 'pending'
  const complete = ALL_ANSWERS.includes(typed)
  const longer = ALL_ANSWERS.some((a) => a.length > typed.length && a.startsWith(typed))
  if (complete && !longer) return 'wrong'
  return typed.length < 2 || longer ? 'pending' : 'wrong'
}

/** A valid sprint length in minutes (anything else is 1). */
export function sprintLength(minutes: number): number {
  return (SPRINT_MINUTES as readonly number[]).includes(minutes) ? minutes : 1
}

/** Kana for a sprint: the ones studied in this script (or the basic kana if that's too few). */
export function sprintPool(save: SaveFile, script: Script): Kana[] {
  const studied = new Set(
    [script, 'combined' as const].flatMap((deck) =>
      Object.entries(save.cards[deck] ?? {})
        .filter(([, card]) => card.state !== 0)
        .map(([id]) => id),
    ),
  )
  const candidates = kanaInGroups(['basic', 'dakuten', 'yoon'], script)
  const known = candidates.filter((k) => studied.has(k.id))
  return known.length >= MIN_POOL ? known : candidates.filter((k) => k.group === 'basic')
}

/** Questions for a sprint: each script's pool, in that script. */
export function sprintQuestions(save: SaveFile, choice: ScriptChoice): Question[] {
  return scriptsOf(choice).flatMap((script) =>
    sprintPool(save, script).map((kana) => ({ kana, script })),
  )
}

/** Every kana a wrong answer can name in this script, so a mix-up is logged even outside the pool. */
export function answerPool(script: Script): Kana[] {
  return kanaInGroups(['basic', 'dakuten', 'yoon', 'extended'], script)
}

/** A random question from the pool, never the same one twice in a row. */
export function nextQuestion(
  pool: readonly Question[],
  previous?: Question,
  rand = Math.random,
): Question {
  const last = previous && questionKey(previous)
  const choices = pool.length > 1 ? pool.filter((q) => questionKey(q) !== last) : pool
  return choices[Math.floor(rand() * choices.length)]
}

export function sprintMinutes(result: SprintResult): number {
  return result.minutes ?? 1
}

export function bestSprint(save: SaveFile, choice: ScriptChoice, minutes: number): number {
  const results = (save.sprints[choice] ?? []).filter((s) => sprintMinutes(s) === minutes)
  return Math.max(0, ...results.map((s) => s.score))
}

/** Keep the most recent results of each length, so a rarely run length keeps its record. */
export function trimSprints(list: readonly SprintResult[]): SprintResult[] {
  const kept = new Map<number, number>()
  const out: SprintResult[] = []
  for (let i = list.length - 1; i >= 0; i--) {
    const minutes = sprintMinutes(list[i])
    const n = kept.get(minutes) ?? 0
    if (n >= KEEP) continue
    kept.set(minutes, n + 1)
    out.push(list[i])
  }
  return out.reverse()
}

/** Save a sprint result. Returns true when it's a new record for this script choice and length. */
export function recordSprint(
  save: SaveFile,
  choice: ScriptChoice,
  minutes: number,
  score: number,
  now = Date.now(),
): boolean {
  const best = bestSprint(save, choice, minutes)
  const result: SprintResult = minutes === 1 ? { score, at: now } : { score, at: now, minutes }
  save.sprints[choice] = trimSprints([...(save.sprints[choice] ?? []), result])
  return score > best
}

/** A whole number of seconds as `m:ss`. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
