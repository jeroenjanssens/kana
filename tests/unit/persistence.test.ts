import { describe, expect, test } from 'vitest'
import {
  MAX_LOG_ENTRIES,
  STORAGE_KEY,
  clear,
  exportFileName,
  exportJson,
  importJson,
  load,
  migrate,
  sanitizeSettings,
  save,
  type StorageLike,
} from '../../src/lib/storage/persistence'
import { DEFAULT_SETTINGS, emptySave } from '../../src/lib/storage/schema'
import { grade } from '../../src/lib/srs/scheduler'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('sanitizeSettings', () => {
  test('fills in defaults', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ newPerDay: 20 }).newPerDay).toBe(20)
    expect(sanitizeSettings({ newPerDay: 20 }).theme).toBe('system')
  })
  test('drops values of the wrong type and unknown keys', () => {
    const s = sanitizeSettings({ newPerDay: 'lots', bogus: 1, groups: [1, 2] })
    expect(s.newPerDay).toBe(DEFAULT_SETTINGS.newPerDay)
    expect(s.groups).toEqual(DEFAULT_SETTINGS.groups)
    expect('bogus' in s).toBe(false)
  })
  test('old saves get the new photo settings', () => {
    const s = sanitizeSettings({ photoEvery: 20 })
    expect(s).toMatchObject({ photoMode: 'cards', photoEvery: 20, photoMinutes: 5, photoSlug: '' })
  })

  test('does not share arrays with the defaults', () => {
    const s = sanitizeSettings({})
    s.groups.push('extended')
    expect(DEFAULT_SETTINGS.groups).not.toContain('extended')
  })
})

describe('migrate', () => {
  test('rejects non-objects and missing versions', () => {
    expect(() => migrate(null)).toThrow()
    expect(() => migrate([])).toThrow()
    expect(() => migrate({})).toThrow('Missing version')
  })
  test('rejects saves from newer versions', () => {
    expect(() => migrate({ version: 99 })).toThrow('newer version')
  })
  test('keeps valid cards and drops broken ones', () => {
    const card = grade(undefined, 3, 0)
    const save = migrate({
      version: 1,
      cards: { hiragana: { a: card, i: { due: 'soon' } }, bogus: { a: card } },
    })
    expect(save.cards.hiragana).toEqual({ a: card })
    expect('bogus' in save.cards).toBe(false)
  })
  test('filters log entries', () => {
    const ok = { t: 1, mode: 'srs', id: 'a', correct: true, ms: 900 }
    const save = migrate({ version: 1, log: [ok, { t: 'x' }, null] })
    expect(save.log).toEqual([ok])
  })
  test('restores word progress, notes and celebrations', () => {
    const save = migrate({
      version: 1,
      words: { ねこ: { seen: 2, correct: 1, last: 5 }, bad: 'x' },
      seenNotes: ['sokuon', 3],
      celebrated: { hiragana: ['a', 1] },
      daily: { day: '2026-01-01', newShown: { hiragana: 4, katakana: 'x' } },
    })
    expect(save.words).toEqual({ ねこ: { seen: 2, correct: 1, last: 5 } })
    expect(save.seenNotes).toEqual(['sokuon'])
    expect(save.celebrated).toEqual({ hiragana: ['a'] })
    expect(save.daily).toEqual({ day: '2026-01-01', newShown: { hiragana: 4 } })
  })
})

describe('load and save', () => {
  test('load returns an empty save when nothing is stored', () => {
    const s = load(memoryStorage())
    expect(s.cards).toEqual({})
    expect(s.settings).toEqual(DEFAULT_SETTINGS)
  })

  test('round-trips through storage', () => {
    const storage = memoryStorage()
    const data = emptySave(123)
    data.cards.katakana = { ka: grade(undefined, 4, 0) }
    data.settings.theme = 'dark'
    save(data, storage)
    expect(load(storage)).toEqual(data)
  })

  test('keeps corrupt data aside and starts fresh', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    const s = load(storage)
    expect(s.cards).toEqual({})
    expect([...storage.data.keys()].some((k) => k.startsWith(`${STORAGE_KEY}:corrupt:`))).toBe(true)
  })

  test('save trims the log', () => {
    const storage = memoryStorage()
    const data = emptySave()
    data.log = Array.from({ length: MAX_LOG_ENTRIES + 10 }, (_, i) => ({
      t: i,
      mode: 'srs' as const,
      id: 'a',
      correct: true,
      ms: 1,
    }))
    save(data, storage)
    const loaded = load(storage)
    expect(loaded.log).toHaveLength(MAX_LOG_ENTRIES)
    expect(loaded.log[0].t).toBe(10)
  })

  test('clear removes the save', () => {
    const storage = memoryStorage()
    save(emptySave(), storage)
    clear(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('export and import', () => {
  test('round-trips', () => {
    const data = emptySave(5)
    data.cards.combined = { shi: grade(undefined, 3, 0) }
    expect(importJson(exportJson(data))).toEqual(data)
  })
  test('gives a readable error for invalid files', () => {
    expect(() => importJson('nope')).toThrow('not valid JSON')
    expect(() => importJson('{"hello": 1}')).toThrow()
  })
  test('file name contains the date', () => {
    expect(exportFileName(new Date('2026-03-04T10:00:00Z'))).toBe('kana-progress-2026-03-04.json')
  })
})
