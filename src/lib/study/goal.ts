import { dayKey } from '../srs/scheduler'
import type { ReviewEntry, SaveFile } from '../storage/schema'

/** Answers (in any mode) logged today. */
export function answersToday(log: readonly ReviewEntry[], now: number = Date.now()): number {
  const today = dayKey(now)
  let n = 0
  for (let i = log.length - 1; i >= 0 && dayKey(log[i].t) === today; i--) n++
  return n
}

export function goalProgress(save: SaveFile, now: number = Date.now()) {
  const goal = Math.max(1, save.settings.dailyGoal)
  const done = answersToday(save.log, now)
  return { done, goal, reached: done >= goal, fraction: Math.min(1, done / goal) }
}

/** Days on which the goal was reached. */
export function goalDays(log: readonly ReviewEntry[], goal: number): Set<string> {
  const counts = new Map<string, number>()
  for (const e of log) {
    const key = dayKey(e.t)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, n]) => n >= goal).map(([day]) => day))
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Fold a content line to 75 octets as RFC 5545 requires (continuation lines start with a space). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74
    if (bytes.encode(current + ch).length > limit) {
      out.push(current)
      current = ch
    } else current += ch
  }
  out.push(current)
  return out.join('\r\n ')
}

/**
 * An iCalendar file with a daily recurring reminder at a local time ("HH:MM"), starting tomorrow.
 * Floating local time (no time zone), so it stays at that hour wherever you are.
 */
export function reminderIcs(options: { time: string; url: string; now?: Date }): string {
  const now = options.now ?? new Date()
  const [hour, minute] = options.time.split(':').map(Number)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute)
  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(hour)}${pad(minute)}00`
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kana//daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:kana-daily-${stamp}@jeroenjanssens.github.io`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${local}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Practise kana 仮名',
    `DESCRIPTION:A few minutes of hiragana and katakana keeps your streak going. ${options.url}`,
    `URL:${options.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time for kana',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
