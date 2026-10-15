import { describe, expect, test } from 'vitest'
import { prng, shuffle } from '../../src/lib/ui/random'

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
