import { describe, expect, test } from 'vitest'
import { Session } from '../../src/lib/srs/scheduler'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'
import { recordReview } from '../../src/lib/study/actions'
import { UndoStack } from '../../src/lib/study/undo'

const NOW = new Date(2026, 6, 1, 10).getTime()
const DAY = 86_400_000

function answer(
  save: ReturnType<typeof emptySave>,
  session: Session,
  undo: UndoStack,
  grade: 1 | 2 | 3 | 4,
  now = NOW,
) {
  const id = session.next(now)!
  undo.record(save, session, 'hiragana', id)
  const r = recordReview(save, { deck: 'hiragana', id, grade, ms: 1000, now })
  session.answer(id, r.after, now)
  return id
}

describe('UndoStack', () => {
  test('undo restores the save file and the session exactly', () => {
    const save = emptySave(1)
    const session = new Session({ learning: [], review: [], fresh: ['a', 'i', 'u'] })
    const undo = new UndoStack()
    const before = structuredClone(save)
    const snapBefore = session.snapshot()
    const id = answer(save, session, undo, 3)
    expect(save.cards.hiragana?.a).toBeDefined()
    expect(undo.undo(save, session)).toBe(id)
    expect(save).toEqual(before)
    expect(session.snapshot()).toEqual(snapBefore)
    expect(session.next(NOW)).toBe('a')
  })

  test('several undos in a row go back step by step', () => {
    const save = emptySave(1)
    const session = new Session({ learning: [], review: [], fresh: ['a', 'i', 'u'] })
    const undo = new UndoStack()
    answer(save, session, undo, 4)
    answer(save, session, undo, 1)
    answer(save, session, undo, 3)
    expect(save.log).toHaveLength(3)
    expect(undo.undo(save, session)).toBe('u')
    expect(undo.undo(save, session)).toBe('i')
    expect(save.log).toHaveLength(1)
    expect(save.daily.newShown.hiragana).toBe(1)
    expect(session.seenCount).toBe(1)
    expect(undo.size).toBe(1)
    expect(undo.undo(save, session)).toBe('a')
    expect(undo.undo(save, session)).toBeUndefined()
  })

  test('undoing a review restores the previous card state', () => {
    const save = emptySave(1)
    const card: CardRecord = {
      due: NOW - DAY,
      stability: 5,
      difficulty: 5,
      elapsed_days: 4,
      scheduled_days: 4,
      learning_steps: 0,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: NOW - 5 * DAY,
    }
    save.cards.hiragana = { a: { ...card } }
    const session = new Session({ learning: [], review: ['a'], fresh: [] })
    const undo = new UndoStack()
    answer(save, session, undo, 1)
    expect(save.cards.hiragana.a.lapses).toBe(1)
    undo.undo(save, session)
    expect(save.cards.hiragana.a).toEqual(card)
  })

  test('undoing an answer that made a card mature removes the celebration', () => {
    const save = emptySave(1)
    save.cards.hiragana = {
      a: {
        due: NOW,
        stability: 30,
        difficulty: 3,
        elapsed_days: 20,
        scheduled_days: 20,
        learning_steps: 0,
        reps: 6,
        lapses: 0,
        state: 2,
        last_review: NOW - 20 * DAY,
      },
    }
    const session = new Session({ learning: [], review: ['a'], fresh: [] })
    const undo = new UndoStack()
    answer(save, session, undo, 3)
    expect(save.celebrated.hiragana).toEqual(['a'])
    undo.undo(save, session)
    expect(save.celebrated.hiragana).toBeUndefined()
  })
})

describe('Session snapshots', () => {
  test('restore brings back an earlier state', () => {
    const s = new Session({ learning: ['l'], review: ['r'], fresh: ['n'] })
    const snap = s.snapshot()
    s.answer('l', { ...({} as CardRecord), state: 2, due: NOW + DAY } as CardRecord, NOW)
    expect(s.remaining).toBe(2)
    s.restore(snap)
    expect(s.remaining).toBe(3)
    expect(s.seenCount).toBe(0)
  })
})
