import { format, resolveLang, type Lang, type Params } from '../lib/i18n/format'
import { en, loadMessages, type MessageKey, type Messages } from '../lib/i18n/messages'
import { settings } from './app.svelte'

const browser =
  typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? [navigator.language])]

/** The languages loaded so far (raw: the tables are replaced, never changed). */
let loaded = $state.raw<Partial<Record<Lang, Messages>>>({ en })
const loading = new Map<Lang, Promise<void>>()

/** The interface language (reactive: follows the setting). */
export function lang(): Lang {
  return resolveLang(settings().language, browser)
}

/** Load a language's messages; the app waits for this before its first paint. */
export function loadLanguage(l: Lang = lang()): Promise<void> {
  if (loaded[l]) return Promise.resolve()
  let promise = loading.get(l)
  if (!promise) {
    promise = loadMessages(l)
      .then((messages) => void (loaded = { ...loaded, [l]: messages }))
      // Offline without the chunk: stay in English, and try again next time.
      .catch(() => void loading.delete(l))
    loading.set(l, promise)
  }
  return promise
}

/** Translate a message, filling in `{placeholders}`. English until the language has loaded. */
export function t(key: MessageKey, params?: Params): string {
  const l = lang()
  const messages = loaded[l]
  if (!messages) void loadLanguage(l)
  return format(messages?.[key] ?? en[key], params)
}
