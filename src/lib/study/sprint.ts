import { acceptedAnswers, kanaInGroups, type Kana, type Script } from '../data/kana'
import type { SaveFile } from '../storage/schema'
import { normalize } from './answer'

export const SPRINT_MS = 60_000
/** A wrong answer costs this much time. */
export const PENALTY_MS = 2000
const MIN_POOL = 10
const KEEP = 50

export type Judgement = 'correct' | 'wrong' | 'pending'

/**
 * Judge romaji while it's being typed: correct as soon as it matches an accepted spelling, wrong
 * as soon as it can't become one any more, pending otherwise. No Enter needed.
 */
export function judge(input: string, kana: Kana): Judgement {
  const typed = normalize(input)
  if (!typed) return 'pending'
  const answers = acceptedAnswers(kana).map(normalize)
  if (answers.includes(typed)) return 'correct'
  return answers.some((a) => a.startsWith(typed)) ? 'pending' : 'wrong'
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
