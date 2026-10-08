import { segment } from './kana'

const SOKUON = new Set(['っ', 'ッ'])

function lastVowel(text: string): string {
  const m = /[aiueo](?=[^aiueo]*$)/.exec(text)
  return m ? m[0] : ''
}

/**
 * Every plausible way to type a kana word in romaji, kana by kana ("wāpuro" style):
 * っ doubles the next consonant (っち → tchi or cchi), ー repeats the previous vowel, and ん may
 * be typed as n or nn.
 */
export function romajiVariants(kana: string): string[] {
  const parts = segment(kana)
  let variants = ['']
  parts.forEach((part, i) => {
    const next = parts[i + 1]?.kana?.romaji
    if (SOKUON.has(part.text)) {
      if (!next) return
      variants = next.startsWith('ch')
        ? variants.flatMap((v) => [v + 't', v + 'c'])
        : variants.map((v) => v + next[0])
    } else if (part.text === 'ー') {
      variants = variants.map((v) => v + lastVowel(v))
    } else if (part.kana?.id === 'n') {
      variants = variants.flatMap((v) => [v + 'n', v + 'nn'])
    } else if (part.kana) {
      variants = variants.map((v) => v + part.kana!.romaji)
    }
  })
  return [...new Set(variants)]
}

const MACRON_DOUBLE: Record<string, string[]> = {
  ā: ['aa', 'a'],
  ī: ['ii', 'i'],
  ū: ['uu', 'u'],
  ē: ['ee', 'ei', 'e'],
  ō: ['ou', 'oo', 'o'],
}

/** Spellings of a Hepburn romanisation with macrons spelled out in different ways. */
export function macronVariants(romaji: string): string[] {
  let variants = ['']
  for (const c of romaji.toLowerCase().replace(/['’\s-]/g, '')) {
    const options = MACRON_DOUBLE[c] ?? [c]
    variants = variants.flatMap((v) => options.map((o) => v + o))
  }
  return [...new Set(variants)]
}
