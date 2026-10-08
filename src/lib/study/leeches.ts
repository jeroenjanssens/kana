import type { CardRecord, DeckId, SaveFile } from '../storage/schema'

/** Cards forgotten this many times are "leeches": they need extra help, not just more reviews. */
export const DEFAULT_LEECH_THRESHOLD = 6

export function isLeech(
  card: CardRecord | undefined,
  threshold = DEFAULT_LEECH_THRESHOLD,
): boolean {
  return (card?.lapses ?? 0) >= threshold
}

/** True when an answer just pushed a card over the leech threshold. */
export function becameLeech(
  before: CardRecord | undefined,
  after: CardRecord,
  threshold = DEFAULT_LEECH_THRESHOLD,
): boolean {
  return !isLeech(before, threshold) && isLeech(after, threshold)
}

/** All leeches, most-forgotten first. */
export function leeches(
  save: SaveFile,
  threshold = DEFAULT_LEECH_THRESHOLD,
): { deck: DeckId; id: string; lapses: number }[] {
  return Object.entries(save.cards)
    .flatMap(([deck, cards]) =>
      Object.entries(cards ?? {})
        .filter(([, card]) => isLeech(card, threshold))
        .map(([id, card]) => ({ deck: deck as DeckId, id, lapses: card.lapses })),
    )
    .sort((a, b) => b.lapses - a.lapses)
}
