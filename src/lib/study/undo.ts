import type { Session, SessionSnapshot } from '../srs/queue'
import type { CardRecord, DeckId, SaveFile } from '../storage/schema'

/** Everything one answer changed, so it can be reverted exactly. */
interface UndoStep {
  deck: DeckId
  id: string
  /** The deck's cards existed before (an answer may create the container). */
  hadDeck: boolean
  card: CardRecord | undefined
  logLength: number
  daily: SaveFile['daily']
  celebrated: string[] | undefined
  session: SessionSnapshot
}

/**
 * Undo for study sessions. Call `record` right before an answer changes the save file, and `undo`
 * to put the save file and the session back exactly as they were.
 */
export class UndoStack {
  private steps: UndoStep[] = []

  get size(): number {
    return this.steps.length
  }

  record(save: SaveFile, session: Session, deck: DeckId, id: string): void {
    const card = save.cards[deck]?.[id]
    this.steps.push({
      deck,
      id,
      hadDeck: deck in save.cards,
      card: card ? { ...card } : undefined,
      logLength: save.log.length,
      daily: { day: save.daily.day, newShown: { ...save.daily.newShown } },
      celebrated: save.celebrated[deck] ? [...save.celebrated[deck]] : undefined,
      session: session.snapshot(),
    })
  }

  /** Revert the last answer. Returns the card id to show again, or undefined if there's nothing. */
  undo(save: SaveFile, session: Session): string | undefined {
    const step = this.steps.pop()
    if (!step) return undefined
    if (!step.hadDeck) {
      delete save.cards[step.deck]
    } else {
      const cards = save.cards[step.deck]!
      if (step.card) cards[step.id] = { ...step.card }
      else delete cards[step.id]
    }
    save.log.splice(step.logLength)
    save.daily = { day: step.daily.day, newShown: { ...step.daily.newShown } }
    if (step.celebrated) save.celebrated[step.deck] = [...step.celebrated]
    else delete save.celebrated[step.deck]
    session.restore(step.session)
    return step.id
  }

  clear(): void {
    this.steps = []
  }
}
