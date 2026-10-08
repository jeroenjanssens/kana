import { hash } from './random'

export interface Photo {
  slug: string
  title: string
  photographer: string
  photographerUrl: string
  sourceUrl: string
  license: string
  location: string
  season: Season
  color: string
  width: number
  height: number
}

export const PHOTO_WIDTHS = [640, 1280, 1920] as const

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'any'

/** The season in Japan: spring Mar–May, summer Jun–Aug, autumn Sep–Nov, winter Dec–Feb. */
export function seasonOf(date: Date = new Date()): Exclude<Season, 'any'> {
  const m = date.getMonth()
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

/** Photos for a season: that season's own, plus the season-neutral ones. */
export function photosForSeason<T extends Pick<Photo, 'season'>>(
  photos: readonly T[],
  season: Season,
): T[] {
  return photos.filter((p) => p.season === season || p.season === 'any')
}

/** Index of the "photo of the day" for a day key. */
export function photoOfTheDay(day: string, count: number): number {
  return count > 0 ? hash(day) % count : 0
}

export function srcset(base: string, slug: string, format: 'avif' | 'webp'): string {
  return PHOTO_WIDTHS.map((w) => `${base}photos/${slug}-${w}.${format} ${w}w`).join(', ')
}

interface NetworkInformation {
  saveData?: boolean
  effectiveType?: string
}

/** True when the browser reports a data-saver preference or a very slow connection. */
export function prefersDataSaving(nav: { connection?: NetworkInformation } | undefined): boolean {
  const c = nav?.connection
  if (!c) return false
  return c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g'
}

export type PhotoMode = 'cards' | 'minutes' | 'daily' | 'fixed'

/** The photo `delta` steps away from `slug` (wrapping around), or the first one if unknown. */
export function stepPhoto(photos: readonly Pick<Photo, 'slug'>[], slug: string, delta: number) {
  if (!photos.length) return slug
  const i = photos.findIndex((p) => p.slug === slug)
  const from = i === -1 ? 0 : i
  const n = photos.length
  return photos[(((from + delta) % n) + n) % n].slug
}

/**
 * The photo to show when the app starts. A saved photo is kept (even if it's out of season), except
 * in "daily" mode, where a new day brings the photo of the day. New photos come from `photos`
 * (the ones in rotation); `all` is every photo there is.
 */
export function startPhoto(
  photos: readonly Pick<Photo, 'slug'>[],
  state: { mode: PhotoMode; slug: string; day: string },
  today: string,
  all: readonly Pick<Photo, 'slug'>[] = photos,
): { slug: string; day: string } {
  const known = all.some((p) => p.slug === state.slug)
  if ((state.mode === 'daily' && state.day !== today) || !known) {
    return { slug: photos[photoOfTheDay(today, photos.length)]?.slug ?? state.slug, day: today }
  }
  return { slug: state.slug, day: state.day }
}
