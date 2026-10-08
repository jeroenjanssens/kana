import { describe, expect, test } from 'vitest'
import { emptySave, type ReviewEntry } from '../../src/lib/storage/schema'
import {
  answersToday,
  foldLine,
  goalDays,
  goalProgress,
  reminderIcs,
} from '../../src/lib/study/goal'

const NOW = new Date(2026, 9, 8, 15).getTime()
const DAY = 86_400_000
const entry = (t: number): ReviewEntry => ({ t, mode: 'srs', id: 'a', correct: true, ms: 1 })

describe('daily goal', () => {
  test('counts only today', () => {
    const log = [entry(NOW - DAY), entry(NOW - 1000), entry(NOW)]
    expect(answersToday(log, NOW)).toBe(2)
  })

  test('progress', () => {
    const s = emptySave()
    s.settings.dailyGoal = 4
    s.log = [entry(NOW), entry(NOW), entry(NOW)]
    expect(goalProgress(s, NOW)).toEqual({ done: 3, goal: 4, reached: false, fraction: 0.75 })
    s.log.push(entry(NOW), entry(NOW))
    expect(goalProgress(s, NOW)).toMatchObject({ reached: true, fraction: 1 })
  })

  test('goalDays lists the days the goal was reached', () => {
    const log = [entry(NOW - DAY), entry(NOW - DAY), entry(NOW)]
    expect([...goalDays(log, 2)]).toEqual(['2026-10-07'])
  })
})

describe('calendar reminder', () => {
  const ics = reminderIcs({
    time: '19:30',
    url: 'https://jeroenjanssens.github.io/kana/',
    now: new Date(2026, 9, 8, 12),
  })

  test('is a valid daily event at the chosen local time, starting tomorrow', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261009T193000\r\n')
    expect(ics).toContain('RRULE:FREQ=DAILY\r\n')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics.split('BEGIN:').length).toBe(ics.split('END:').length)
  })

  test('uses CRLF line endings and folds long lines', () => {
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
    for (const line of ics.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const folded = foldLine('X'.repeat(160))
    expect(folded.split('\r\n ')).toHaveLength(3)
    expect(folded.replace(/\r\n /g, '')).toBe('X'.repeat(160))
  })
})
