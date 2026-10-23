import { describe, expect, test } from 'vitest'
import { MAX_LOG_ENTRIES, SaveWriter } from '../../src/lib/storage/persistence'
import { emptySave, type ReviewEntry, type SaveFile } from '../../src/lib/storage/schema'
import { recordReview } from '../../src/lib/study/actions'

const entry = (t: number, id = 'ka'): ReviewEntry => ({
  t,
  mode: 'srs',
  deck: 'hiragana',
  id,
  correct: true,
  grade: 3,
  ms: 900,
})

/** What a fresh, full serialisation gives. */
const fresh = (data: SaveFile) => JSON.parse(new SaveWriter().serialize(data))

describe.each([
  ['plain data', () => ({ data: emptySave(1) })],
  [
    'reactive state',
    () => {
      const store = $state({ data: emptySave(1) })
      return store
    },
  ],
])('SaveWriter on %s', (_, make) => {
  test('writes the whole save file', () => {
    const store = make()
    store.data.log.push(entry(1), entry(2))
    store.data.settings.theme = 'dark'
    const text = new SaveWriter().serialize(store.data)
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(store.data)))
  })

  test('keeps up as reviews are added, undone and the log is replaced', () => {
    const store = make()
    const writer = new SaveWriter()
    const check = () => expect(JSON.parse(writer.serialize(store.data))).toEqual(fresh(store.data))
    check()
    recordReview(store.data, { deck: 'hiragana', id: 'a', grade: 3, ms: 800, now: 10 })
    check()
    recordReview(store.data, { deck: 'hiragana', id: 'i', grade: 1, ms: 800, now: 20 })
    check()
    // Undo cuts the log back (see undo.ts).
    store.data.log.splice(1)
    check()
    // Undo and a new answer before the next save: same length, different last entry.
    store.data.log.splice(store.data.log.length - 1, 1, entry(30, 'u'))
    check()
    store.data.log = [entry(40)]
    check()
    store.data = emptySave(2)
    check()
  })
})

test('only the newest reviews are written', () => {
  const data = emptySave()
  for (let i = 0; i < MAX_LOG_ENTRIES + 5; i++) data.log.push(entry(i))
  const saved = JSON.parse(new SaveWriter().serialize(data)) as SaveFile
  expect(saved.log).toHaveLength(MAX_LOG_ENTRIES)
  expect(saved.log[0].t).toBe(5)
  expect(data.log).toHaveLength(MAX_LOG_ENTRIES + 5)
})
