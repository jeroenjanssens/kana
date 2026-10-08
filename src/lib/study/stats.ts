import { kanaById } from '../data/kana'
import {
  DAY_ROLLOVER_HOUR,
  type MasteryLevel,
  masteryLevel,
  retrievability,
  startOfNextDay,
  dayKey,
} from '../srs/scheduler'
import type { CardRecord, DeckId, ReviewEntry } from '../storage/schema'

const DAY = 86_400_000

/** Number of answers per day key. */
export function dailyCounts(log: readonly ReviewEntry[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of log) {
    const key = dayKey(e.t)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** The day key `n` days before `now`'s day. */
export function shiftDay(now: number, n: number): string {
  const d = new Date(now)
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
  d.setDate(d.getDate() - n)
  d.setHours(12)
  return dayKey(d.getTime() + DAY_ROLLOVER_HOUR * 3600_000)
}

export interface Streak {
  current: number
  longest: number
  studiedToday: boolean
}

/** Consecutive days with at least one answer. Today not being studied yet does not break it. */
export function streak(log: readonly ReviewEntry[], now: number = Date.now()): Streak {
  const days = dailyCounts(log)
  const studiedToday = days.has(dayKey(now))
  let current = 0
  for (let n = studiedToday ? 0 : 1; days.has(shiftDay(now, n)); n++) current++

  const sorted = [...days.keys()].sort()
  let longest = 0
  let run = 0
  let prev: string | undefined
  for (const key of sorted) {
    run = prev && nextDayKey(prev) === key ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = key
  }
  return { current, longest: Math.max(longest, current), studiedToday }
}

export function nextDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d + 1, 12)
  return dayKey(date.getTime())
}

export interface HeatmapDay {
  key: string
  count: number
  /** 0 = none, 1–4 = intensity buckets. */
  level: 0 | 1 | 2 | 3 | 4
}

/** The last `weeks` × 7 days, oldest first, ending today. */
export function heatmap(log: readonly ReviewEntry[], now: number = Date.now(), weeks = 53) {
  const counts = dailyCounts(log)
  const total = weeks * 7
  const days: HeatmapDay[] = []
  const max = Math.max(1, ...counts.values())
  for (let n = total - 1; n >= 0; n--) {
    const key = shiftDay(now, n)
    const count = counts.get(key) ?? 0
    const level = count === 0 ? 0 : (Math.min(4, Math.ceil((count / max) * 4)) as 1 | 2 | 3 | 4)
    days.push({ key, count, level })
  }
  return days
}

/** Number of cards due on each of the next `days` days (index 0 = today, including overdue). */
export function forecast(
  decks: Partial<Record<DeckId, Record<string, CardRecord>>>,
  now: number = Date.now(),
  days = 14,
): number[] {
  const out = new Array<number>(days).fill(0)
  const today = startOfNextDay(now)
  for (const cards of Object.values(decks)) {
    for (const card of Object.values(cards ?? {})) {
      if (card.state === 0) continue
      const index = card.due < today ? 0 : Math.floor((card.due - today) / DAY) + 1
      if (index < days) out[index]++
    }
  }
  return out
}

export function masteryCounts(
  cards: Record<string, CardRecord> | undefined,
  ids: readonly string[],
): Record<MasteryLevel, number> {
  const counts: Record<MasteryLevel, number> = { new: 0, learning: 0, young: 0, mature: 0 }
  for (const id of ids) counts[masteryLevel(cards?.[id])]++
  return counts
}

export interface KanaPerformance {
  deck: DeckId
  id: string
  answers: number
  correct: number
  accuracy: number
  lapses: number
  retrievability?: number
  /** Average response time over typed/quiz answers, ms. */
  avgMs?: number
  /** Higher is weaker. */
  weakness: number
}

export function performance(
  log: readonly ReviewEntry[],
  decks: Partial<Record<DeckId, Record<string, CardRecord>>>,
  now: number = Date.now(),
): KanaPerformance[] {
  const byKey = new Map<string, { deck: DeckId; id: string; n: number; ok: number; ms: number[] }>()
  for (const e of log) {
    if (!e.deck || !isAnswer(e)) continue
    const key = `${e.deck}:${e.id}`
    const p = byKey.get(key) ?? { deck: e.deck, id: e.id, n: 0, ok: 0, ms: [] }
    p.n++
    if (e.correct) p.ok++
    if (e.ms > 0 && e.ms < 60_000) p.ms.push(e.ms)
    byKey.set(key, p)
  }
  const out: KanaPerformance[] = []
  for (const p of byKey.values()) {
    const card = decks[p.deck]?.[p.id]
    const accuracy = p.ok / p.n
    const r = retrievability(card, now)
    const lapses = card?.lapses ?? 0
    out.push({
      deck: p.deck,
      id: p.id,
      answers: p.n,
      correct: p.ok,
      accuracy,
      lapses,
      retrievability: r,
      avgMs: p.ms.length ? p.ms.reduce((a, b) => a + b, 0) / p.ms.length : undefined,
      weakness: (1 - accuracy) * 3 + lapses + (r === undefined ? 0 : (1 - r) * 2),
    })
  }
  return out
}

export function weakest(perf: readonly KanaPerformance[], n = 10): KanaPerformance[] {
  return [...perf]
    .filter((p) => p.weakness > 0)
    .sort((a, b) => b.weakness - a.weakness || a.accuracy - b.accuracy)
    .slice(0, n)
}

export interface Confusion {
  /** The kana that was shown. */
  shown: string
  /** The kana that was answered instead. */
  answered: string
  count: number
  /** The deck the mix-up first happened in. */
  deck?: DeckId
}

/** Pairs of kana that were mixed up, from wrong answers that name another kana id. */
export function confusions(log: readonly ReviewEntry[], n = 10): Confusion[] {
  const counts = new Map<string, Confusion>()
  for (const e of log) {
    if (e.correct || !e.answer || e.answer === e.id) continue
    try {
      kanaById(e.answer)
    } catch {
      continue
    }
    const [a, b] = [e.id, e.answer].sort()
    const key = `${a}|${b}`
    const c = counts.get(key) ?? { shown: e.id, answered: e.answer, count: 0, deck: e.deck }
    c.count++
    counts.set(key, c)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, n)
}

/** Introductions are activity, but not answers: they don't count towards accuracy. */
export function isAnswer(e: ReviewEntry): boolean {
  return e.mode !== 'intro'
}

export function totalAnswers(log: readonly ReviewEntry[]): { total: number; correct: number } {
  const answers = log.filter(isAnswer)
  return { total: answers.length, correct: answers.filter((e) => e.correct).length }
}
