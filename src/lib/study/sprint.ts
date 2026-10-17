import { KANA, acceptedAnswers, kanaInGroups, type Kana, type Script } from '../data/kana'
import type { SaveFile } from '../storage/schema'
import { normalize } from './answer'

export const SPRINT_MS = 60_000
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

/** Every kana a wrong answer can name in this script, so a mix-up is logged even outside the pool. */
export function answerPool(script: Script): Kana[] {
  return kanaInGroups(['basic', 'dakuten', 'yoon', 'extended'], script)
}

/** A random kana from the pool, never the same one twice in a row. */
export function nextSprintKana(pool: readonly Kana[], previous?: Kana, rand = Math.random): Kana {
  const choices = pool.length > 1 ? pool.filter((k) => k.id !== previous?.id) : pool
  return choices[Math.floor(rand() * choices.length)]
}

export function bestSprint(save: SaveFile, script: Script): number {
  return Math.max(0, ...(save.sprints[script] ?? []).map((s) => s.score))
}

/** Save a sprint result. Returns true when it's a new record. */
export function recordSprint(
  save: SaveFile,
  script: Script,
  score: number,
  now = Date.now(),
): boolean {
  const best = bestSprint(save, script)
  save.sprints[script] ??= []
  const list = save.sprints[script]!
  list.push({ score, at: now })
  if (list.length > KEEP) list.splice(0, list.length - KEEP)
  return score > best
}
