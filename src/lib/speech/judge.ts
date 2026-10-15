/** Judging a spoken kana against the one that was asked for. */
import { NO_KANA } from './classes'
import type { Guess, KanaResult } from './recognize'

export interface Verdict {
  /** The model's best guess is the asked-for sound. */
  correct: boolean
  /** How much it sounded like the asked-for sound: its probability, 0–100. */
  score: number
  /** The best guesses that are kana, most likely first (at most 3). */
  heard: Guess[]
  /** Nothing stood out from the background, or the best guess is "no kana". */
  nothing: boolean
}

export function judge(result: KanaResult, sound: string): Verdict {
  const p = result.guesses.find((g) => g.sound === sound)?.p ?? 0
  const top = result.guesses[0]
  const nothing = !result.speech || top.sound === NO_KANA
  return {
    correct: !nothing && top.sound === sound,
    score: Math.round(p * 100),
    heard: result.guesses.filter((g) => g.sound !== NO_KANA).slice(0, 3),
    nothing,
  }
}
