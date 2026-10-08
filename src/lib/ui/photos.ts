import { hash } from './random'

export interface Photo {
  slug: string
  title: string
  photographer: string
  photographerUrl: string
  sourceUrl: string
  license: string
  location: string
  color: string
  width: number
  height: number
}

export const PHOTO_WIDTHS = [640, 1280, 1920] as const

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
 * The photo to show when the app starts. A known saved photo is kept, except in "daily" mode,
 * where a new day brings the photo of the day.
 */
export function startPhoto(
  photos: readonly Pick<Photo, 'slug'>[],
  state: { mode: PhotoMode; slug: string; day: string },
  today: string,
): { slug: string; day: string } {
  const known = photos.some((p) => p.slug === state.slug)
  if ((state.mode === 'daily' && state.day !== today) || !known) {
    return { slug: photos[photoOfTheDay(today, photos.length)]?.slug ?? state.slug, day: today }
  }
  return { slug: state.slug, day: state.day }
}
