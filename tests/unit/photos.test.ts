import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  PHOTO_WIDTHS,
  hash,
  photoOfTheDay,
  prefersDataSaving,
  srcset,
  type Photo,
} from '../../src/lib/ui/photos'

const credits = JSON.parse(readFileSync('public/photos/credits.json', 'utf8')) as Photo[]

describe('photo credits', () => {
  test('there are at least 20 photos', () => expect(credits.length).toBeGreaterThanOrEqual(20))

  test('every photo has attribution and all image files', () => {
    for (const p of credits) {
      expect(p.photographer, p.slug).toBeTruthy()
      expect(p.sourceUrl, p.slug).toMatch(/^https:\/\//)
      expect(p.license, p.slug).toBeTruthy()
      expect(p.color, p.slug).toMatch(/^#[0-9a-f]{6}$/i)
      for (const w of PHOTO_WIDTHS) {
        for (const ext of ['avif', 'webp']) {
          expect(existsSync(`public/photos/${p.slug}-${w}.${ext}`), `${p.slug}-${w}.${ext}`).toBe(
            true,
          )
        }
      }
    }
  })

  test('slugs are unique', () => {
    expect(new Set(credits.map((p) => p.slug)).size).toBe(credits.length)
  })
})

describe('photo helpers', () => {
  test('hash is stable', () => {
    expect(hash('2026-01-01')).toBe(hash('2026-01-01'))
    expect(hash('a')).not.toBe(hash('b'))
  })

  test('photoOfTheDay is in range and changes between days', () => {
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']
    const picks = days.map((d) => photoOfTheDay(d, 24))
    for (const p of picks) expect(p).toBeGreaterThanOrEqual(0)
    for (const p of picks) expect(p).toBeLessThan(24)
    expect(new Set(picks).size).toBeGreaterThan(1)
    expect(photoOfTheDay('x', 0)).toBe(0)
  })

  test('srcset lists all widths', () => {
    expect(srcset('/kana/', 'fuji', 'avif')).toBe(
      '/kana/photos/fuji-640.avif 640w, /kana/photos/fuji-1280.avif 1280w, /kana/photos/fuji-1920.avif 1920w',
    )
  })

  test('prefersDataSaving', () => {
    expect(prefersDataSaving(undefined)).toBe(false)
    expect(prefersDataSaving({})).toBe(false)
    expect(prefersDataSaving({ connection: { saveData: true } })).toBe(true)
    expect(prefersDataSaving({ connection: { effectiveType: '2g' } })).toBe(true)
    expect(prefersDataSaving({ connection: { effectiveType: '4g' } })).toBe(false)
  })
})
