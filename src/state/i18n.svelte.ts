import { format, resolveLang, type Lang, type Params } from '../lib/i18n/format'
import { messages, type MessageKey } from '../lib/i18n/messages'
import { settings } from './app.svelte'

const browser =
  typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? [navigator.language])]

/** The interface language (reactive: follows the setting). */
export function lang(): Lang {
  return resolveLang(settings().language, browser)
}

/** Translate a message, filling in `{placeholders}`. */
export function t(key: MessageKey, params?: Params): string {
  return format(messages[lang()][key] ?? messages.en[key], params)
}
