import { KANA } from '../data/kana'
import { masteryLevel } from '../srs/queue'
import type { DeckId, SaveFile } from '../storage/schema'

/** Day streaks worth celebrating. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]

/** If every kana in the row of `kanaId` is now mature in `deck`, return that row's kana ids. */
export function rowMastered(save: SaveFile, deck: DeckId, kanaId: string): string[] | undefined {
  const kana = KANA.find((k) => k.id === kanaId)
  if (!kana) return undefined
  const row = KANA.filter(
    (k) =>
      k.group === kana.group &&
      k.row === kana.row &&
      (deck === 'katakana' || deck === 'listen-katakana' || k.hiragana !== ''),
  )
  const cards = save.cards[deck] ?? {}
  return row.every((k) => masteryLevel(cards[k.id]) === 'mature') ? row.map((k) => k.id) : undefined
}

export function isStreakMilestone(days: number): boolean {
  return STREAK_MILESTONES.includes(days)
}
