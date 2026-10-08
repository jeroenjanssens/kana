import { DECK_IDS, DEFAULT_SETTINGS, SCHEMA_VERSION, emptySave } from './schema'
import type { CardRecord, ReviewEntry, SaveFile, Settings } from './schema'

export const STORAGE_KEY = 'kana:save'

/** Older review entries beyond this are dropped to keep storage small (≈ years of daily use). */
export const MAX_LOG_ENTRIES = 50_000

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Keep only known settings with the right type; fill in defaults for the rest. */
export function sanitizeSettings(raw: unknown): Settings {
  const settings = structuredClone(DEFAULT_SETTINGS)
  if (!isObject(raw)) return settings
  for (const key of Object.keys(settings) as (keyof Settings)[]) {
    const value = raw[key]
    const fallback = settings[key]
    if (value === undefined) continue
    if (Array.isArray(fallback)) {
      const type = key === 'fsrsWeights' ? 'number' : 'string'
      if (Array.isArray(value) && value.every((v) => typeof v === type)) {
        ;(settings[key] as unknown) = value
      }
    } else if (typeof value === typeof fallback) {
      ;(settings[key] as unknown) = value
    }
  }
  return settings
}

function isCardRecord(v: unknown): v is CardRecord {
  if (!isObject(v)) return false
  const numbers = ['due', 'stability', 'difficulty', 'scheduled_days', 'reps', 'lapses', 'state']
  return numbers.every((k) => typeof v[k] === 'number' && Number.isFinite(v[k]))
}

function sanitizeCard(v: Json): CardRecord {
  return {
    due: v.due as number,
    stability: v.stability as number,
    difficulty: v.difficulty as number,
    elapsed_days: typeof v.elapsed_days === 'number' ? v.elapsed_days : 0,
    scheduled_days: v.scheduled_days as number,
    learning_steps: typeof v.learning_steps === 'number' ? v.learning_steps : 0,
    reps: v.reps as number,
    lapses: v.lapses as number,
    state: Math.min(3, Math.max(0, Math.round(v.state as number))) as CardRecord['state'],
    ...(typeof v.last_review === 'number' ? { last_review: v.last_review } : {}),
  }
}

function isReviewEntry(v: unknown): v is ReviewEntry {
  return (
    isObject(v) &&
    typeof v.t === 'number' &&
    typeof v.mode === 'string' &&
    typeof v.id === 'string' &&
    typeof v.correct === 'boolean' &&
    typeof v.ms === 'number'
  )
}

/** Migrate and validate any (possibly old or hand-edited) save into the current schema. */
export function migrate(raw: unknown): SaveFile {
  if (!isObject(raw)) throw new Error('Not a kana save file')
  const version = raw.version
  if (typeof version !== 'number') throw new Error('Missing version')
  if (version > SCHEMA_VERSION) {
    throw new Error(`This save was made by a newer version of kana (v${version})`)
  }

  const save = emptySave(typeof raw.createdAt === 'number' ? raw.createdAt : Date.now())
  save.settings = sanitizeSettings(raw.settings)

  if (isObject(raw.cards)) {
    for (const deck of DECK_IDS) {
      const cards = raw.cards[deck]
      if (!isObject(cards)) continue
      const clean: Record<string, CardRecord> = {}
      for (const [id, card] of Object.entries(cards)) {
        if (isCardRecord(card)) clean[id] = sanitizeCard(card as unknown as Json)
      }
      save.cards[deck] = clean
    }
  }

  if (isObject(raw.words)) {
    for (const [word, p] of Object.entries(raw.words)) {
      if (isObject(p) && typeof p.seen === 'number' && typeof p.correct === 'number') {
        save.words[word] = {
          seen: p.seen,
          correct: p.correct,
          last: typeof p.last === 'number' ? p.last : 0,
        }
      }
    }
  }

  if (Array.isArray(raw.log)) save.log = raw.log.filter(isReviewEntry).slice(-MAX_LOG_ENTRIES)

  if (isObject(raw.daily) && typeof raw.daily.day === 'string' && isObject(raw.daily.newShown)) {
    save.daily = {
      day: raw.daily.day,
      newShown: Object.fromEntries(
        Object.entries(raw.daily.newShown).filter(([, n]) => typeof n === 'number'),
      ),
    }
  }

  if (Array.isArray(raw.seenNotes)) {
    save.seenNotes = raw.seenNotes.filter((n): n is string => typeof n === 'string')
  }

  if (typeof raw.goalDay === 'string') save.goalDay = raw.goalDay
  if (typeof raw.settingsUpdatedAt === 'number') save.settingsUpdatedAt = raw.settingsUpdatedAt

  if (isObject(raw.sprints)) {
    for (const script of ['hiragana', 'katakana'] as const) {
      const list = raw.sprints[script]
      if (Array.isArray(list)) {
        save.sprints[script] = list.filter(
          (s): s is { score: number; at: number } =>
            isObject(s) && typeof s.score === 'number' && typeof s.at === 'number',
        )
      }
    }
  }

  if (isObject(raw.celebrated)) {
    for (const deck of DECK_IDS) {
      const ids = raw.celebrated[deck]
      if (Array.isArray(ids)) save.celebrated[deck] = ids.filter((i) => typeof i === 'string')
    }
  }

  return save
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function load(storage: StorageLike = localStorage): SaveFile {
  const text = storage.getItem(STORAGE_KEY)
  if (!text) return emptySave()
  try {
    return migrate(JSON.parse(text))
  } catch (err) {
    console.warn('Could not read saved progress, starting fresh', err)
    // Keep the unreadable data around so it can be recovered by hand.
    storage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, text)
    return emptySave()
  }
}

export function save(data: SaveFile, storage: StorageLike = localStorage): void {
  if (data.log.length > MAX_LOG_ENTRIES) data.log = data.log.slice(-MAX_LOG_ENTRIES)
  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clear(storage: StorageLike = localStorage): void {
  storage.removeItem(STORAGE_KEY)
}

export function exportJson(data: SaveFile): string {
  return JSON.stringify({ app: 'kana', exportedAt: new Date().toISOString(), ...data }, null, 2)
}

/** Parse an exported file. Throws a readable error when the file is not valid. */
export function importJson(text: string): SaveFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('The file is not valid JSON')
  }
  return migrate(raw)
}

export function exportFileName(now = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  return `kana-progress-${day}.json`
}

/** Ask the browser not to evict our storage. Resolves to whether storage is persistent. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
