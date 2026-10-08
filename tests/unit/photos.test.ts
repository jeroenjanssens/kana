import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  PHOTO_WIDTHS,
  photoOfTheDay,
  prefersDataSaving,
  srcset,
  startPhoto,
  stepPhoto,
  type Photo,
} from '../../src/lib/ui/photos'
import { hash } from '../../src/lib/ui/random'

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

describe('photo rotation', () => {
  const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]

  test('stepPhoto wraps around in both directions', () => {
    expect(stepPhoto(list, 'a', 1)).toBe('b')
    expect(stepPhoto(list, 'c', 1)).toBe('a')
    expect(stepPhoto(list, 'a', -1)).toBe('c')
    expect(stepPhoto(list, 'b', 5)).toBe('a')
    expect(stepPhoto(list, 'unknown', 1)).toBe('b')
    expect(stepPhoto([], 'x', 1)).toBe('x')
  })

  test('startPhoto keeps a saved photo in every mode but daily', () => {
    for (const mode of ['cards', 'minutes', 'fixed'] as const) {
      expect(startPhoto(list, { mode, slug: 'c', day: '2026-01-01' }, '2026-02-02')).toEqual({
        slug: 'c',
        day: '2026-01-01',
      })
    }
  })

  test('daily mode shows the photo of the day once the day changes', () => {
    const today = '2026-02-02'
    const daily = list[photoOfTheDay(today, list.length)].slug
    expect(startPhoto(list, { mode: 'daily', slug: 'c', day: '2026-02-01' }, today)).toEqual({
      slug: daily,
      day: today,
    })
    // Later the same day, a photo chosen with the arrows is kept.
    expect(startPhoto(list, { mode: 'daily', slug: 'b', day: today }, today).slug).toBe('b')
  })

  test('an unknown or empty saved photo falls back to the photo of the day', () => {
    const today = '2026-03-03'
    expect(startPhoto(list, { mode: 'cards', slug: '', day: '' }, today).slug).toBe(
      list[photoOfTheDay(today, list.length)].slug,
    )
  })
})
