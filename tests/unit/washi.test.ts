import { describe, expect, test } from 'vitest'
import { generateWashi, prng } from '../../src/lib/ui/washi'

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

describe('generateWashi', () => {
  test('returns undefined when canvas is unavailable (jsdom)', () => {
    expect(generateWashi()).toBeUndefined()
  })
})
