import { buildQueue, deckKana, type Queue } from '../srs/scheduler'
import type { DeckId, SaveFile } from '../storage/schema'
import { newShownToday, reviewedToday } from './actions'
import { masteryCounts } from './stats'

export const DECK_INFO: Record<DeckId, { title: string; jp: string; sample: string }> = {
  hiragana: { title: 'Hiragana', jp: 'ひらがな', sample: 'あ' },
  katakana: { title: 'Katakana', jp: 'カタカナ', sample: 'ア' },
  combined: { title: 'Combined', jp: 'ひらがな・カタカナ', sample: 'あア' },
  'listen-hiragana': { title: 'Listening · Hiragana', jp: 'ききとり', sample: 'あ' },
  'listen-katakana': { title: 'Listening · Katakana', jp: 'ききとり', sample: 'ア' },
  'write-hiragana': { title: 'Writing · Hiragana', jp: 'かきかた', sample: 'あ' },
  'write-katakana': { title: 'Writing · Katakana', jp: 'かきかた', sample: 'ア' },
}

export function queueFor(save: SaveFile, deck: DeckId, now: number = Date.now()): Queue {
  const s = save.settings
  return buildQueue({
    cards: save.cards[deck] ?? {},
    kana: deckKana(deck, s.groups),
    now,
    newLimit: s.newPerDay,
    reviewLimit: s.reviewsPerDay,
    newShownToday: newShownToday(save, deck, now),
    reviewedToday: reviewedToday(save, deck, now),
  })
}

export interface DeckSummary {
  deck: DeckId
  total: number
  due: number
  fresh: number
  mastery: ReturnType<typeof masteryCounts>
}

export function deckSummary(save: SaveFile, deck: DeckId, now: number = Date.now()): DeckSummary {
  const ids = deckKana(deck, save.settings.groups).map((k) => k.id)
  const q = queueFor(save, deck, now)
  return {
    deck,
    total: ids.length,
    due: q.learning.length + q.review.length,
    fresh: q.fresh.length,
    mastery: masteryCounts(save.cards[deck], ids),
  }
}
