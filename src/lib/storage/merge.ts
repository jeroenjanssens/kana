import { DECK_IDS, type CardRecord, type ReviewEntry, type SaveFile } from './schema'

/**
 * Merge two copies of the progress (e.g. this device and the synced copy) without losing work:
 * - each card: the version reviewed most recently
 * - the review log: the union of both, without duplicates, in time order
 * - word progress: the higher counts
 * - settings: the copy whose settings were changed most recently
 * The result doesn't depend on the order of the arguments.
 */
export function mergeSaves(a: SaveFile, b: SaveFile): SaveFile {
  // Order the inputs canonically so ties are broken the same way whichever way round we're called.
  const [x, y] = JSON.stringify(a) <= JSON.stringify(b) ? [a, b] : [b, a]
  const out = structuredClone(x)

  out.settingsUpdatedAt = Math.max(x.settingsUpdatedAt, y.settingsUpdatedAt)
  out.settings = structuredClone(
    y.settingsUpdatedAt > x.settingsUpdatedAt ? y.settings : x.settings,
  )

  out.cards = {}
  for (const deck of DECK_IDS) {
    const ids = new Set([...Object.keys(x.cards[deck] ?? {}), ...Object.keys(y.cards[deck] ?? {})])
    if (!ids.size) continue
    const merged: Record<string, CardRecord> = {}
    for (const id of ids) {
      merged[id] = structuredClone(newerCard(x.cards[deck]?.[id], y.cards[deck]?.[id])!)
    }
    out.cards[deck] = merged
  }

  out.log = mergeLogs(x.log, y.log)

  out.words = structuredClone(x.words)
  for (const [word, p] of Object.entries(y.words)) {
    const q = out.words[word]
    out.words[word] = q
      ? {
          seen: Math.max(p.seen, q.seen),
          correct: Math.max(p.correct, q.correct),
          last: Math.max(p.last, q.last),
        }
      : { ...p }
  }

  out.seenNotes = [...new Set([...x.seenNotes, ...y.seenNotes])].sort()

  out.celebrated = {}
  for (const deck of DECK_IDS) {
    const ids = [...new Set([...(x.celebrated[deck] ?? []), ...(y.celebrated[deck] ?? [])])].sort()
    if (ids.length) out.celebrated[deck] = ids
  }

  out.sprints = {}
  for (const script of ['hiragana', 'katakana'] as const) {
    const all = [...(x.sprints[script] ?? []), ...(y.sprints[script] ?? [])]
    const unique = [...new Map(all.map((s) => [`${s.at}:${s.score}`, s])).values()]
    if (unique.length) out.sprints[script] = unique.sort((p, q) => p.at - q.at).slice(-50)
  }

  // Daily counters: the later day wins; on the same day, the higher count per deck.
  if (x.daily.day === y.daily.day) {
    const newShown = { ...x.daily.newShown }
    for (const [deck, n] of Object.entries(y.daily.newShown)) {
      newShown[deck as keyof typeof newShown] = Math.max(
        n ?? 0,
        newShown[deck as keyof typeof newShown] ?? 0,
      )
    }
    out.daily = { day: x.daily.day, newShown }
  } else {
    out.daily = structuredClone(x.daily.day > y.daily.day ? x.daily : y.daily)
  }

  out.goalDay = x.goalDay > y.goalDay ? x.goalDay : y.goalDay
  out.createdAt = Math.min(x.createdAt, y.createdAt)
  return out
}

function newerCard(p: CardRecord | undefined, q: CardRecord | undefined): CardRecord | undefined {
  if (!p) return q
  if (!q) return p
  const lp = p.last_review ?? 0
  const lq = q.last_review ?? 0
  if (lp !== lq) return lp > lq ? p : q
  if (p.reps !== q.reps) return p.reps > q.reps ? p : q
  return JSON.stringify(p) >= JSON.stringify(q) ? p : q
}

function entryKey(e: ReviewEntry): string {
  return `${e.t}|${e.mode}|${e.deck ?? ''}|${e.id}|${e.grade ?? ''}|${e.correct ? 1 : 0}`
}

export function mergeLogs(a: readonly ReviewEntry[], b: readonly ReviewEntry[]): ReviewEntry[] {
  const all = new Map<string, ReviewEntry>()
  for (const e of [...a, ...b]) all.set(entryKey(e), e)
  return [...all.values()]
    .sort((p, q) => p.t - q.t || entryKey(p).localeCompare(entryKey(q)))
    .map((e) => structuredClone(e))
}
