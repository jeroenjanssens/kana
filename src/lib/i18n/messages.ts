import type { Lang } from './format'
import enCommon from './en/common'
import enHome from './en/home'
import enStudy from './en/study'
import enPractice from './en/practice'
import enTable from './en/table'
import enStats from './en/stats'
import enSettings from './en/settings'
import enMisc from './en/misc'

/**
 * All interface text. Each area has an English file (the source of truth) and a Dutch file that
 * must have exactly the same keys (checked by the type system and by tests). The Dutch files are
 * combined in nl/index.ts.
 */
export const en = {
  ...enCommon,
  ...enHome,
  ...enStudy,
  ...enPractice,
  ...enTable,
  ...enStats,
  ...enSettings,
  ...enMisc,
}

export type MessageKey = keyof typeof en

export type Messages = Record<MessageKey, string>

/**
 * A language's messages. English is always loaded (it's the fallback, so it's bundled with the
 * app); other languages are separate chunks, so a first visit only downloads the one it needs.
 */
export async function loadMessages(lang: Lang): Promise<Messages> {
  return lang === 'en' ? en : (await import('./nl')).default
}
