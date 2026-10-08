import { describe, expect, test } from 'vitest'
import { prng } from '../../src/lib/ui/random'
import { WASHI_VARIANTS, generateWashi, washiStyle } from '../../src/lib/ui/washi'

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

describe('washiStyle', () => {
  const parse = (style: string) =>
    Object.fromEntries(style.split(';').map((d) => d.split(':').map((x) => x.trim())))

  test('is deterministic for the same seed', () => {
    expect(washiStyle('ka')).toBe(washiStyle('ka'))
    expect(washiStyle(5)).toBe(washiStyle(5))
  })

  test('picks one of the textures, an angle and an offset', () => {
    for (const seed of ['a', 'shi', 'kya', 1, 2, 3]) {
      const v = parse(washiStyle(seed))
      expect(v['--washi-tex']).toMatch(
        new RegExp(`^var\\(--washi-[0-${WASHI_VARIANTS.length - 1}]\\)$`),
      )
      const angle = parseInt(v['--washi-angle'])
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThanOrEqual(360)
      expect(parseInt(v['--washi-x'])).toBeLessThanOrEqual(384)
    }
  })

  test('different seeds give different paper', () => {
    const styles = new Set(['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku'].map(washiStyle))
    expect(styles.size).toBe(8)
    const textures = new Set(
      Array.from({ length: 40 }, (_, i) => parse(washiStyle(i))['--washi-tex']),
    )
    expect(textures.size).toBe(WASHI_VARIANTS.length)
  })
})

test('the paper variants differ', () => {
  expect(new Set(WASHI_VARIANTS.map((v) => JSON.stringify(v))).size).toBe(WASHI_VARIANTS.length)
})
