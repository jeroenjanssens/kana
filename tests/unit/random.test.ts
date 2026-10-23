import { describe, expect, test } from 'vitest'
import { hash, prng, shuffle } from '../../src/lib/ui/random'

describe('prng', () => {
  test('is deterministic and in [0, 1)', () => {
    const a = prng(42)
    const b = prng(42)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
  test('different seeds give different sequences', () => {
    expect(prng(1)()).not.toBe(prng(2)())
  })
})

test('hash is stable and spreads similar strings', () => {
  expect(hash('ka')).toBe(hash('ka'))
  expect(new Set(['ka', 'ki', 'ku', 'ke', 'ko', 'kya'].map(hash)).size).toBe(6)
})

describe('shuffle', () => {
  test('returns a reordered copy with the same items', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const out = shuffle(items, prng(1))
    expect(out).not.toBe(items)
    expect(out).not.toEqual(items)
    expect([...out].sort((a, b) => a - b)).toEqual(items)
    expect(items).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })

  test('is deterministic for a seeded generator', () => {
    expect(shuffle([1, 2, 3, 4, 5], prng(7))).toEqual(shuffle([1, 2, 3, 4, 5], prng(7)))
  })
})
