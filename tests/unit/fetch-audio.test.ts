import { describe, expect, test } from 'vitest'
import { firstUtterance } from '../../scripts/fetch-audio'

describe('firstUtterance', () => {
  test('finds the first sounding segment between silences', () => {
    const log = `
      silence_start: 0
      silence_end: 0.82 | silence_duration: 0.82
      silence_start: 1.10
      silence_end: 1.96 | silence_duration: 0.86
      silence_start: 2.16`
    expect(firstUtterance(log, 3.3)).toEqual({ start: 0.82, end: 1.1 })
  })

  test('handles audio that starts with sound', () => {
    const log = `silence_start: 0.4\nsilence_end: 1.0`
    expect(firstUtterance(log, 2)).toEqual({ start: 0, end: 0.4 })
  })

  test('skips tiny blips', () => {
    const log = `silence_start: 0\nsilence_end: 0.5\nsilence_start: 0.52\nsilence_end: 1.0\nsilence_start: 1.3`
    expect(firstUtterance(log, 2)).toEqual({ start: 1.0, end: 1.3 })
  })

  test('returns the tail when there is no trailing silence', () => {
    expect(firstUtterance('silence_start: 0\nsilence_end: 0.3', 0.8)).toEqual({
      start: 0.3,
      end: 0.8,
    })
  })

  test('returns undefined for pure silence', () => {
    expect(firstUtterance('silence_start: 0', 1)).toBeUndefined()
  })
})
