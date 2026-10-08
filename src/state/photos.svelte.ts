import { dayKey } from '../lib/srs/scheduler'
import { photosForSeason, seasonOf, startPhoto, stepPhoto, type Photo } from '../lib/ui/photos'
import { settings } from './app.svelte'

/** The background photos (loaded once) and how the current one changes. */
export const gallery = $state<{ photos: Photo[] }>({ photos: [] })

let loading: Promise<void> | undefined

/** The photos in rotation: all of them, or only those matching the current season. */
export function activePhotos(): Photo[] {
  return settings().matchSeason ? photosForSeason(gallery.photos, seasonOf()) : gallery.photos
}

export function loadPhotos(base = import.meta.env.BASE_URL): Promise<void> {
  loading ??= fetch(`${base}photos/credits.json`)
    .then((r) => r.json())
    .then((list: Photo[]) => {
      gallery.photos = list
      const s = settings()
      const start = startPhoto(
        activePhotos(),
        { mode: s.photoMode, slug: s.photoSlug, day: s.photoDay },
        dayKey(),
        list,
      )
      s.photoSlug = start.slug
      s.photoDay = start.day
    })
    .catch(() => {
      gallery.photos = []
    })
  return loading
}

/** Show the previous (-1) or next (+1) photo. In "fixed" mode it then stays. */
export function showPhoto(delta: number): void {
  const s = settings()
  s.photoSlug = stepPhoto(activePhotos(), s.photoSlug, delta)
}

export function choosePhoto(slug: string): void {
  settings().photoSlug = slug
}

let cardsSinceChange = 0

/** Call after each answered card; in "cards" mode the photo changes every N cards. */
export function cardDone(): void {
  const s = settings()
  if (s.photoMode !== 'cards') return
  if (++cardsSinceChange >= s.photoEvery) {
    cardsSinceChange = 0
    showPhoto(1)
  }
}
