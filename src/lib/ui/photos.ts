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

/** Stable string hash (FNV-1a). */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
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
