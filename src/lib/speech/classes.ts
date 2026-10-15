import { KANA, type Kana } from '../data/kana'

/**
 * The sounds the kana speech model tells apart: one per distinct pronunciation, so kana that
 * sound the same share one (お/を, じ/ぢ, ず/づ). Extended katakana (ファ, ティ…) come later.
 */
export interface SoundClass {
  /** The sound's romaji, which is unique per sound: 'o', 'ji', 'kya'. */
  id: string
  /** Kana ids with this sound, in learning order. */
  kana: string[]
}

/** For silence, noise, coughs and anything that isn't a single kana. */
export const NO_KANA = '_'

function build(): SoundClass[] {
  const byRomaji = new Map<string, string[]>()
  for (const k of KANA) {
    if (k.group === 'extended') continue
    byRomaji.set(k.romaji, [...(byRomaji.get(k.romaji) ?? []), k.id])
  }
  return [...byRomaji].map(([id, kana]) => ({ id, kana }))
}

export const SOUND_CLASSES: readonly SoundClass[] = build()

/** The sound class of a kana, or undefined for kana the model doesn't know (yet). */
export function soundOf(kana: Kana): string | undefined {
  return kana.group === 'extended' ? undefined : kana.romaji
}
