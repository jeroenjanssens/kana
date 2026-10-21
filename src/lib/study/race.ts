import type { KanaGroup } from '../data/kana'
import { atLeast, deckKana, masteryLevel, type MasteryLevel } from '../srs/queue'
import type { RaceResult, SaveFile } from '../storage/schema'
import { shuffle } from '../ui/random'
import { kanaInRows, rowOptions } from './rows'
import { questionKey, scriptsOf, type Question, type RaceKana, type ScriptChoice } from './scripts'
export { RACE_KANA, type RaceKana } from './scripts'

export interface RaceSetup {
  script: ScriptChoice
  kana: RaceKana
  /** Row keys (`basic:k`) for 'rows'. */
  rows: readonly string[]
}

/** How well a kana is known in a script: the better of its own deck and the combined deck. */
function level(save: SaveFile, script: 'hiragana' | 'katakana', id: string): MasteryLevel {
  const levels = [script, 'combined' as const].map((deck) => masteryLevel(save.cards[deck]?.[id]))
  return levels.reduce((a, b) => (atLeast(a, b) ? a : b))
}

/**
 * The questions of a race, in table order: all hiragana first, then all katakana. Only kana in the
 * groups enabled in Settings; "mastered" means at least young.
 */
export function raceQuestions(
  save: SaveFile,
  setup: RaceSetup,
  groups: readonly KanaGroup[],
): Question[] {
  return scriptsOf(setup.script).flatMap((script) => {
    const pool = deckKana(script, groups)
    const kana =
      setup.kana === 'rows'
        ? kanaInRows(rowOptions(pool), setup.rows)
        : setup.kana === 'all'
          ? pool
          : pool.filter((k) =>
              atLeast(level(save, script, k.id), setup.kana === 'seen' ? 'learning' : 'young'),
            )
    return kana.map((k) => ({ kana: k, script }))
  })
}

/** The order to race in: as given, or shuffled (scripts mixed). */
export function raceOrder(questions: readonly Question[], random: boolean, rand = Math.random) {
  return random ? shuffle(questions, rand) : [...questions]
}

/**
 * A short id for a set of questions, the same whatever their order: the number of questions and
 * a hash (FNV-1a) of their sorted keys.
 */
export function raceKey(questions: readonly Question[]): string {
  const text = questions.map(questionKey).sort().join(',')
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${questions.length}-${hash.toString(16).padStart(8, '0')}`
}

export function bestRace(save: SaveFile, key: string): RaceResult | undefined {
  return save.races[key]
}

/** Save a finished race if it's the fastest for its set. Returns the time it has to beat, if any. */
export function recordRace(
  save: SaveFile,
  key: string,
  ms: number,
  mistakes: number,
  now = Date.now(),
): { previous?: RaceResult; record: boolean } {
  const previous = save.races[key]
  const record = !previous || ms < previous.ms
  if (record) save.races[key] = { ms: Math.round(ms), mistakes, at: now }
  return { previous, record: record && !!previous }
}

/** A time as `m:ss.t`, e.g. 83 400 ms → `1:23.4`. */
export function formatRaceTime(ms: number): string {
  const tenths = Math.max(0, Math.floor(ms / 100))
  const seconds = Math.floor(tenths / 10)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${tenths % 10}`
}
