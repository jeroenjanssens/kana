/** Languages the interface is available in. */
export type Lang = 'en' | 'nl'
export const LANGS: readonly Lang[] = ['en', 'nl']

export type Params = Record<string, string | number>

/**
 * Fill in `{name}` placeholders. A placeholder can choose between forms by number:
 * `{count|day|days}` gives "1 day" style choices (first form when the number is 1).
 */
export function format(message: string, params: Params = {}): string {
  return message.replace(
    /\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g,
    (whole, name: string, one?: string, other?: string) => {
      const value = params[name]
      if (value === undefined) return whole
      if (one !== undefined && other !== undefined) return Number(value) === 1 ? one : other
      return String(value)
    },
  )
}

/** The placeholder names used in a message, for checking translations. */
export function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{(\w+)/g)].map((m) => m[1]))].sort()
}

/** The language to use for a setting ('system' follows the browser). */
export function resolveLang(setting: string, browser: readonly string[] = []): Lang {
  if (setting === 'en' || setting === 'nl') return setting
  return browser.some((l) => l.toLowerCase().startsWith('nl')) ? 'nl' : 'en'
}
