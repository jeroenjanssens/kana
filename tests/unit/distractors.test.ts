import { describe, expect, test } from 'vitest'
import { KANA, kanaById, kanaInGroups } from '../../src/lib/data/kana'
import { chooseOptions } from '../../src/lib/study/distractors'

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const pool = kanaInGroups(['basic', 'dakuten'])

describe('chooseOptions', () => {
  test('returns the requested number of options including the target', () => {
    const opts = chooseOptions(kanaById('ka'), pool, 4, { rand: seeded() })
    expect(opts).toHaveLength(4)
    expect(opts.map((k) => k.id)).toContain('ka')
  })

  test('options have unique romaji and never repeat the target sound', () => {
    for (const target of pool) {
      const opts = chooseOptions(target, pool, 6, { rand: seeded(target.order + 1) })
      const romaji = opts.map((k) => k.romaji)
      expect(new Set(romaji).size).toBe(romaji.length)
    }
    const ji = chooseOptions(kanaById('ji'), pool, 6, { rand: seeded() })
    expect(ji.map((k) => k.id)).not.toContain('di')
  })

  test('prefers look-alikes', () => {
    const opts = chooseOptions(kanaById('shi'), pool, 3, {
      lookAlikes: ['tsu', 'n'],
      rand: seeded(),
    })
    expect(opts.map((k) => k.id).sort()).toEqual(['n', 'shi', 'tsu'])
  })

  test('prefers sound-alikes for listening', () => {
    const opts = chooseOptions(kanaById('shi'), pool, 4, { soundAlikes: true, rand: seeded() })
    const ids = opts.map((k) => k.id)
    expect(
      ids.filter((id) => ['chi', 'ji', 'hi', 'di'].includes(id)).length,
    ).toBeGreaterThanOrEqual(2)
  })

  test('returns fewer options when the pool is small', () => {
    const tiny = [kanaById('a'), kanaById('i')]
    expect(chooseOptions(kanaById('a'), tiny, 6)).toHaveLength(2)
  })

  test('works for every kana', () => {
    for (const k of KANA) expect(chooseOptions(k, KANA, 4).length).toBe(4)
  })
})
