import { SYSTEM_FONT_ID, fontById, fontUrl } from '../data/fonts'

const loading = new Map<string, Promise<boolean>>()

/** Load a kana font on demand. Resolves to true once it can be used (false if unavailable). */
export function loadFont(id: string, base = import.meta.env.BASE_URL): Promise<boolean> {
  if (id === SYSTEM_FONT_ID) return Promise.resolve(true)
  const cached = loading.get(id)
  if (cached) return cached
  const font = fontById(id)
  if (!font || typeof FontFace === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false)
  }
  const face = new FontFace(font.family, `url(${fontUrl(font, base)}) format('woff2')`, {
    display: 'swap',
  })
  const promise = face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded)
      return true
    })
    .catch(() => false)
  loading.set(id, promise)
  return promise
}

/** Load a font, but give up waiting after `ms` so the UI never hangs on a slow network. */
export function loadFontWithin(id: string, ms = 1200): Promise<boolean> {
  return Promise.race([loadFont(id), new Promise<boolean>((r) => setTimeout(() => r(false), ms))])
}
