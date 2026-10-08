// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  MIN_REVIEWS,
  scheduledReviews,
  trainingData,
  validWeights,
} from '../../src/lib/srs/optimizer'
import { configureScheduler, createScheduler, grade, newRecord } from '../../src/lib/srs/scheduler'
import type { ReviewEntry } from '../../src/lib/storage/schema'

const DAY = 86_400_000
const T0 = new Date(2026, 0, 1, 12).getTime()

const e = (id: string, day: number, grade: 1 | 2 | 3 | 4, mode = 'srs'): ReviewEntry => ({
  t: T0 + day * DAY,
  mode: mode as ReviewEntry['mode'],
  deck: 'hiragana',
  id,
  correct: grade > 1,
  grade,
  ms: 1000,
})

describe('trainingData', () => {
  test('builds one item per review after the first, with day intervals', () => {
    const data = trainingData([
      e('a', 0, 3),
      e('i', 0, 1),
      e('a', 2, 3),
      e('a', 7, 4),
      e('i', 1, 3),
    ])
    expect(data.cards).toBe(2)
    expect(data.reviews).toBe(5)
    expect(Array.from(data.lengths)).toEqual([2, 3, 2])
    expect(Array.from(data.ratings)).toEqual([3, 3, 3, 3, 4, 1, 3])
    expect(Array.from(data.deltas)).toEqual([0, 2, 0, 2, 5, 0, 1])
  })

  test('only uses graded, scheduled reviews', () => {
    const log = [
      e('a', 0, 3),
      e('a', 1, 3, 'order'),
      { ...e('a', 2, 3, 'intro'), grade: undefined },
      e('a', 3, 3, 'listen'),
    ]
    expect(trainingData(log).reviews).toBe(2)
    expect(scheduledReviews(log)).toBe(2)
  })

  test('validWeights', () => {
    expect(validWeights(new Array(21).fill(1))).toBe(true)
    expect(validWeights(new Array(19).fill(1))).toBe(false)
    expect(validWeights([...new Array(20).fill(1), NaN])).toBe(false)
  })
})

describe('personalised scheduler', () => {
  test('custom weights and retention change the intervals', () => {
    const base = grade(undefined, 4, T0, createScheduler({ fuzz: false }))
    const strict = grade(undefined, 4, T0, createScheduler({ fuzz: false, retention: 0.95 }))
    expect(strict.scheduled_days).toBeLessThan(base.scheduled_days)
    configureScheduler({ retention: 0.95 })
    expect(grade(newRecord(T0), 4, T0).scheduled_days).toBeLessThanOrEqual(base.scheduled_days)
    configureScheduler({})
  })
})

describe('FSRS optimizer (WebAssembly)', () => {
  test('trains 21 finite weights from a synthetic review history', async () => {
    // The wasm glue expects a worker-like global.
    ;(globalThis as { self?: unknown }).self ??= globalThis
    ;(globalThis as { addEventListener?: unknown }).addEventListener ??= () => {}
    const fsrs = await import('../../node_modules/fsrs-browser/fsrs_browser.js')
    fsrs.initSync({ module: readFileSync('node_modules/fsrs-browser/fsrs_browser_bg.wasm') })
    let seed = 7
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const log: ReviewEntry[] = []
    for (let c = 0; c < 150; c++) {
      let day = 0
      let ivl = 1
      for (let k = 0; k < 6; k++) {
        const g = rand() < 0.15 ? 1 : 3
        log.push(e(`k${c}`, day, g))
        ivl = g === 1 ? 1 : Math.round(ivl * 2.5)
        day += ivl
      }
    }
    expect(log.length).toBeGreaterThan(MIN_REVIEWS)
    const data = trainingData(log)
    const weights = Array.from(
      new fsrs.Fsrs().computeParameters(data.ratings, data.deltas, data.lengths, undefined, true),
    )
    expect(validWeights(weights)).toBe(true)
    expect(weights).not.toEqual(Array.from(fsrs.DEFAULT_PARAMETERS()))
    // The weights work with ts-fsrs.
    const r = grade(undefined, 3, T0, createScheduler({ fuzz: false, weights }))
    expect(r.state).toBeGreaterThan(0)
  }, 60_000)
})
