import type { Grade } from '../storage/schema'

/** After a correct answer the sound plays once more; the next card follows after this delay. */
export const LISTEN_ADVANCE_MS = 2000

/** Listening is slower than reading, so allow more time before suggesting Hard. */
export function listenGrade(correct: boolean, ms: number): Grade {
  if (!correct) return 1
  if (ms <= 3000) return 4
  if (ms <= 8000) return 3
  return 2
}
