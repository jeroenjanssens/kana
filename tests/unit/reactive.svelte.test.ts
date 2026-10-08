import { expect, test } from 'vitest'
import { logPractice, markNoteSeen, recordReview, recordWord } from '../../src/lib/study/actions'
import { emptySave, type CardRecord } from '../../src/lib/storage/schema'

/**
 * The actions mutate the save file in place. In the app it's Svelte `$state`, where only values
 * read back through the proxy are tracked; these tests make sure nothing is lost on save.
 */
test('actions work on reactive state and survive a snapshot', () => {
  const store = $state({ data: emptySave() })
  const now = Date.now()
  const almostMature: CardRecord = {
    due: now,
    stability: 30,
    difficulty: 3,
    elapsed_days: 20,
    scheduled_days: 20,
    learning_steps: 0,
    reps: 6,
    lapses: 0,
    state: 2,
    last_review: now - 20 * 86_400_000,
  }
  store.data.cards.katakana = { a: almostMature }

  recordReview(store.data, { deck: 'hiragana', id: 'a', grade: 3, ms: 1000, now })
  recordReview(store.data, { deck: 'hiragana', id: 'i', grade: 3, ms: 1000, now })
  const r = recordReview(store.data, { deck: 'katakana', id: 'a', grade: 3, ms: 1000, now })
  expect(r.becameMature).toBe(true)
  recordWord(store.data, 'ねこ', true, now)
  recordWord(store.data, 'ねこ', false, now)
  markNoteSeen(store.data, 'sokuon')
  logPractice(store.data, { mode: 'order', deck: 'hiragana', id: 'u', correct: true, ms: 1 })

  const snap = $state.snapshot(store.data)
  expect(Object.keys(snap.cards.hiragana ?? {})).toEqual(['a', 'i'])
  expect(snap.celebrated.katakana).toEqual(['a'])
  expect(snap.words['ねこ']).toMatchObject({ seen: 2, correct: 1 })
  expect(snap.seenNotes).toEqual(['sokuon'])
  expect(snap.log).toHaveLength(4)
  expect(snap.daily.newShown).toEqual({ hiragana: 2 })
})
