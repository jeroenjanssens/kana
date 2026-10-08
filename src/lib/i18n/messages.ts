import type { Lang } from './format'
import enCommon from './en/common'
import nlCommon from './nl/common'
import enHome from './en/home'
import nlHome from './nl/home'
import enStudy from './en/study'
import nlStudy from './nl/study'
import enPractice from './en/practice'
import nlPractice from './nl/practice'
import enTable from './en/table'
import nlTable from './nl/table'
import enStats from './en/stats'
import nlStats from './nl/stats'
import enSettings from './en/settings'
import nlSettings from './nl/settings'
import enMisc from './en/misc'
import nlMisc from './nl/misc'

/**
 * All interface text. Each area has an English file (the source of truth) and a Dutch file that
 * must have exactly the same keys (checked by the type system and by tests).
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

export const messages: Record<Lang, Record<MessageKey, string>> = {
  en,
  nl: {
    ...nlCommon,
    ...nlHome,
    ...nlStudy,
    ...nlPractice,
    ...nlTable,
    ...nlStats,
    ...nlSettings,
    ...nlMisc,
  },
}
