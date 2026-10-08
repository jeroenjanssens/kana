import type { Kana } from '../data/kana'

/** Sounds that learners commonly mix up by ear. */
const SOUND_ALIKES: string[][] = [
  ['shi', 'chi', 'ji', 'di', 'hi'],
  ['tsu', 'su', 'zu', 'du', 'tsu'],
  ['ra', 'da', 'na', 'wa'],
  ['ri', 'ni', 'di', 'ji'],
  ['ru', 'nu', 'zu', 'u'],
  ['re', 'ne', 'de', 'e'],
  ['ro', 'no', 'do', 'o', 'wo'],
  ['fu', 'hu', 'u', 'pu', 'bu'],
  ['n', 'mu', 'nu'],
  ['o', 'wo', 'ho'],
  ['e', 'i', 'he'],
  ['ha', 'wa', 'a'],
  ['ki', 'gi', 'chi'],
  ['ka', 'ga', 'ta'],
  ['ku', 'gu', 'tsu'],
  ['ko', 'go', 'to'],
  ['sa', 'za', 'ta'],
  ['so', 'zo', 'to', 'ho'],
  ['ba', 'pa', 'ha', 'wa'],
  ['bi', 'pi', 'hi'],
  ['bo', 'po', 'ho'],
]

const VOWEL = /([aiueo])$/

function vowelOf(k: Kana): string | undefined {
  return k.romaji === 'n' ? undefined : VOWEL.exec(k.romaji)?.[1]
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface DistractorOptions {
  /** Ids of kana that look alike (e.g. from confusable sets) and should be preferred. */
  lookAlikes?: readonly string[]
  /** Prefer kana that sound alike (for listening). */
  soundAlikes?: boolean
  rand?: () => number
}

/**
 * Pick `count` options (including the target) from `pool`, preferring plausible wrong answers:
 * look-alikes, sound-alikes, same row, same vowel; then anything else. Result is shuffled.
 * Kana with identical romaji to the target (e.g. じ/ぢ) are never offered as distractors.
 */
export function chooseOptions(
  target: Kana,
  pool: readonly Kana[],
  count: number,
  options: DistractorOptions = {},
): Kana[] {
  const rand = options.rand ?? Math.random
  const candidates = pool.filter((k) => k.id !== target.id && k.romaji !== target.romaji)
  const score = (k: Kana): number => {
    let s = rand() * 0.5
    if (options.lookAlikes?.includes(k.id)) s += 4
    if (
      options.soundAlikes &&
      SOUND_ALIKES.some((g) => g.includes(target.id) && g.includes(k.id))
    ) {
      s += 3
    }
    if (k.row === target.row) s += 1.5
    if (vowelOf(k) && vowelOf(k) === vowelOf(target)) s += 1
    if (k.group === target.group) s += 0.5
    return s
  }
  const ranked = candidates
    .map((k) => ({ k, s: score(k) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.k)
  // Unique romaji among the wrong answers, so every option is distinguishable.
  const picked: Kana[] = []
  for (const k of ranked) {
    if (picked.length >= count - 1) break
    if (!picked.some((p) => p.romaji === k.romaji)) picked.push(k)
  }
  return shuffle([target, ...picked], rand)
}
