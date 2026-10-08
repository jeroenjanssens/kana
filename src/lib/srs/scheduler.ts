import { type Card, type FSRS, State, createEmptyCard, fsrs } from 'ts-fsrs'
import type { CardRecord, Grade } from '../storage/schema'

/** Everything else about scheduling lives in queue.ts (no ts-fsrs needed); re-exported here. */
export * from './queue'

export interface SchedulerOptions {
  fuzz?: boolean
  /** Personalised FSRS weights (empty: the defaults). */
  weights?: readonly number[]
  /** Desired probability of remembering a card when it's due. */
  retention?: number
}

export function createScheduler(options: SchedulerOptions = {}): FSRS {
  return fsrs({
    request_retention: options.retention ?? 0.9,
    ...(options.weights?.length ? { w: [...options.weights] } : {}),
    enable_fuzz: options.fuzz ?? true,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  })
}

let defaultScheduler = createScheduler()

/** Use personalised weights and/or a different desired retention from now on. */
export function configureScheduler(options: SchedulerOptions): void {
  defaultScheduler = createScheduler(options)
}

export function toCard(record: CardRecord): Card {
  return {
    due: new Date(record.due),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsed_days,
    scheduled_days: record.scheduled_days,
    learning_steps: record.learning_steps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state as State,
    ...(record.last_review !== undefined ? { last_review: new Date(record.last_review) } : {}),
  }
}

export function fromCard(card: Card): CardRecord {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as CardRecord['state'],
    ...(card.last_review ? { last_review: card.last_review.getTime() } : {}),
  }
}

export function newRecord(now: number = Date.now()): CardRecord {
  return fromCard(createEmptyCard(new Date(now)))
}

/** Apply a grade to a card (creating it if it's new) and return the updated record. */
export function grade(
  record: CardRecord | undefined,
  rating: Grade,
  now: number = Date.now(),
  scheduler: FSRS = defaultScheduler,
): CardRecord {
  const card = toCard(record ?? newRecord(now))
  return fromCard(scheduler.next(card, new Date(now), rating).card)
}

/** How long until the card would be due again for each possible grade, in ms. */
export function previewIntervals(
  record: CardRecord | undefined,
  now: number = Date.now(),
  scheduler: FSRS = defaultScheduler,
): Record<Grade, number> {
  const card = toCard(record ?? newRecord(now))
  const preview = scheduler.repeat(card, new Date(now))
  const out = {} as Record<Grade, number>
  for (const g of [1, 2, 3, 4] as Grade[]) out[g] = preview[g].card.due.getTime() - now
  return out
}

export function retrievability(
  record: CardRecord | undefined,
  now: number = Date.now(),
  scheduler: FSRS = defaultScheduler,
): number | undefined {
  if (!record || record.state === 0) return undefined
  return scheduler.get_retrievability(toCard(record), new Date(now), false)
}
