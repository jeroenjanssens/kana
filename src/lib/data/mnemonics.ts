import type { Lang } from '../i18n/format'
import { kanaByChar, type Kana, type Script } from './kana'
import { mnemonicsNl } from './nl/mnemonics'
import { kanaNotesNl } from './nl/notes'

/**
 * Memory hints for the basic kana, written for kana. The sound in the hint is in *asterisks*.
 * Dakuten, handakuten, yōon and extended katakana get a hint built from their parts.
 */
const BASIC: Record<string, { hiragana: string; katakana: string }> = {
  a: {
    hiragana: 'A cross with a big swirl: an *a*ntenna catching a loop of signal — "Ah!"',
    katakana: 'An axe: a short head and a long handle. Chop — "*Ah*!"',
  },
  i: {
    hiragana: 'Two short strokes side by side, like two *ee*ls swimming upright.',
    katakana: 'An *ea*sel: a slanted leg and an upright one.',
  },
  u: {
    hiragana: 'A dash over a hook: someone bent over, groaning "*oo*, my back".',
    katakana: 'Like う with a roof on top: a hut where you shout "*oo*".',
  },
  e: {
    hiragana: 'A dash over a zig-zag: an *e*xotic bird perched on a branch.',
    katakana: 'An I-beam for building an *e*levator shaft.',
  },
  o: {
    hiragana: 'Like あ with a dot at the top right: a golf ball *o*n the tee beside the swing.',
    katakana: 'A cross with a slash: an *o*pera singer flinging out an arm.',
  },
  ka: {
    hiragana: 'A blade, a slash and a spark: a *ka*rate chop that sends sparks flying.',
    katakana: 'Like か without the spark: a clean *ka*rate chop.',
  },
  ki: {
    hiragana: 'A *key*: two crossbars on a shaft, with the bit curling at the bottom.',
    katakana: 'A *key* with two straight teeth — sharper than き.',
  },
  ku: {
    hiragana: 'An open beak: a *cu*ckoo calling "ku!"',
    katakana: 'A beak with a little roof: the *cu*ckoo’s clock.',
  },
  ke: {
    hiragana: 'A *ke*g on its side: a post on the left and a tap on the right.',
    katakana: 'Like a letter K that fell over: *ke*.',
  },
  ko: {
    hiragana: 'Two short strokes, one above the other: a *co*uple of noodles.',
    katakana: 'An open box with two corners: a *co*rner.',
  },
  sa: {
    hiragana: 'A cross with a curl beneath: a *sa*il on a mast, billowing below.',
    katakana: 'A bench with a drop of water: you *sa*t on a wet bench.',
  },
  shi: {
    hiragana: 'One long hook, like the curve of a *she*pherd’s crook.',
    katakana:
      'A face looking left: two eyes stacked on the left, a smile sweeping up — *she* smiles.',
  },
  su: {
    hiragana: 'A crossbar with a loop that drops down: a *swi*ng hanging from a beam.',
    katakana: 'A stool with one leg kicked out: a *su*per spin.',
  },
  se: {
    hiragana: 'A crossbar, two posts and a hook: a *se*t of tools hanging on a rack.',
    katakana: 'Like せ but sharper: a *se*at with a high backrest.',
  },
  so: {
    hiragana: 'A zig-zag that ends in a curve: *so*up being stirred and poured.',
    katakana: 'One dash, and a long stroke falling from the top right: *so*wing seeds downward.',
  },
  ta: {
    hiragana: 'It looks like the letters *ta* joined together: a t on the left, こ on the right.',
    katakana: 'Like ク with a slash inside: someone *ta*king a bite.',
  },
  chi: {
    hiragana: 'A cross with a round belly: a *chee*rful person who ate too much.',
    katakana: 'A cross under a slanted roof: a *chee*rleader’s pom-pom on a stick.',
  },
  tsu: {
    hiragana: 'A single big wave: a *tsu*nami rolling in.',
    katakana: 'Two drops and a long stroke all falling from the top: rain pouring in a *tsu*nami.',
  },
  te: {
    hiragana: 'A bar with a hook hanging down: a *te*nt line with a hook.',
    katakana: 'A T under a roof: a *te*lephone pole.',
  },
  to: {
    hiragana: 'A splinter in a curve: a *toe* with a thorn in it.',
    katakana: 'A post with a twig: a *to*tem pole.',
  },
  na: {
    hiragana: 'A cross, a dot and a loop: a *na*sty knot tied next to a cross.',
    katakana: 'A cross with a long leg: a *na*il.',
  },
  ni: {
    hiragana: 'A post with two short strokes: a *knee* bending beside a bar.',
    katakana: 'Two lines, like the number 2 — and *ni* means two.',
  },
  nu: {
    hiragana: 'Two crossing strokes ending in a loop: a *new* shoelace, knotted with a loop.',
    katakana: 'Like フ with a slash through it: a *noo*dle being cut.',
  },
  ne: {
    hiragana: 'A post and a swirl ending in a loop: a *ne*cklace hanging from a hook.',
    katakana: 'A small tree with a dot on top: a *ne*st in a tree.',
  },
  no: {
    hiragana: 'One swirl, like a "*no* entry" sign drawn in a single stroke.',
    katakana: 'A single slash: "*No*!"',
  },
  ha: {
    hiragana: 'A post and a cross with a loop: a *ha*t hanging on a peg.',
    katakana: 'Two strokes spreading apart, like someone laughing "*ha*".',
  },
  hi: {
    hiragana: 'A wide grin: someone giggling "*hee* hee".',
    katakana: 'A sideways *hee*l: a short bar on a long sole.',
  },
  fu: {
    hiragana: 'Four little strokes, like a face blowing out air: "*fuu*".',
    katakana: 'A hook bending in the wind: *fu*u, blown over.',
  },
  he: {
    hiragana:
      'A small mountain: climbing it makes you go "*he*h". Katakana ヘ looks almost the same.',
    katakana: 'A small mountain, nearly identical to hiragana へ — just a bit more angular.',
  },
  ho: {
    hiragana: 'Like は with an extra bar on top: a *ho*use with a second floor.',
    katakana: 'A cross with two little legs: a *ho*ly cross.',
  },
  ma: {
    hiragana: 'Two bars crossed by a loop: a *ma*st with a sail tied in a knot.',
    katakana: 'An apron hanging from a hook: *ma*ma’s apron.',
  },
  mi: {
    hiragana: 'A swirl that ends like the number 21: *me* at twenty-one.',
    katakana: 'Three slanted lines: *mee*, three stripes on a sleeve.',
  },
  mu: {
    hiragana: 'A loop with a tail and a dot: a cow’s face going "*moo*".',
    katakana: 'A triangle with a tail: a cow’s nose — "*moo*".',
  },
  me: {
    hiragana: 'Like ぬ without the final loop: an eye — and *me* means eye.',
    katakana: 'An X marks the spot: "this is where I, *me*, stand".',
  },
  mo: {
    hiragana: 'A fishhook with two bars: a hook to catch *mo*re fish.',
    katakana: 'Like も drawn with straight lines: two bars and a hook — *mo*re.',
  },
  ya: {
    hiragana: 'A *ya*k’s head with its horns.',
    katakana: 'Like や without the dot: one *ya*k horn.',
  },
  yu: {
    hiragana: 'A loop with a line through it: a *U*-shaped tube.',
    katakana: 'A *U*-turn sign drawn with corners.',
  },
  yo: {
    hiragana: 'A cross with a loop at the bottom: a *yo*-yo hanging from a finger.',
    katakana: 'A backwards E: "*Yo*, that E is backwards!"',
  },
  ra: {
    hiragana: 'A dash over a rounded body: a *ra*bbit’s ear above its back.',
    katakana: 'A dash over フ: a *ra*bbit’s ear over its bent back.',
  },
  ri: {
    hiragana: 'Two strokes, the right one longer: *ree*ds by a river.',
    katakana: 'Like り but straighter: *ree*ds standing tall.',
  },
  ru: {
    hiragana: 'Like ろ with a *loo*p at the end: ru has the loop, ro doesn’t.',
    katakana: 'Two legs, one kicking up: *ru*nning.',
  },
  re: {
    hiragana: 'A post with a sharp kick at the end: a *re*d leg kicking out.',
    katakana: 'A single check mark: *re*ady ✓.',
  },
  ro: {
    hiragana: 'Like る without the loop: an open *ro*ad that just ends.',
    katakana: 'A square: a *ro*bot’s mouth.',
  },
  wa: {
    hiragana: 'Like ね, but the end swings out instead of looping: *wa*ving goodbye.',
    katakana: 'Like ウ without the dash on top: a *wa*ll with a roof.',
  },
  wo: {
    hiragana: 'A person carrying a big hook: someone *wo*bbling under a heavy load.',
    katakana: 'Like ヨ with a tail: "*Wo*ah, the E grew a tail!"',
  },
  n: {
    hiragana: 'Like a lowercase n written in a hurry: "*n*".',
    katakana: 'Like ソ, but the long stroke sweeps *up*: the sound "n" hums upward.',
  },
}

const SMALL: Record<string, string> = {
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
  ャ: 'ya',
  ュ: 'yu',
  ョ: 'yo',
  ァ: 'a',
  ィ: 'i',
  ゥ: 'u',
  ェ: 'e',
  ォ: 'o',
}

/** The kana without its dakuten (゛) or handakuten (゜), e.g. が → か. */
function baseOf(char: string): string | undefined {
  const decomposed = char.normalize('NFD')
  if (decomposed.length < 2) return undefined
  return decomposed[0]
}

export type KanaNote = 'dakuten' | 'handakuten' | 'yoon' | 'small-vowel'

/** The rule-based notes that explain how a kana is built. */
export function notesForKana(kana: Kana): KanaNote[] {
  const text = kana.katakana
  const notes: KanaNote[] = []
  if (/[゙゛]/.test(text.normalize('NFD'))) notes.push('dakuten')
  if (/[゚゜]/.test(text.normalize('NFD'))) notes.push('handakuten')
  if (/[ャュョ]/.test(text)) notes.push('yoon')
  if (/[ァィゥェォ]/.test(text)) notes.push('small-vowel')
  return notes
}

export const KANA_NOTES: Record<KanaNote, { title: string; body: string; example: string }> = {
  dakuten: {
    title: 'Two small marks: dakuten ゛',
    body: 'The two small strokes at the top right make the sound voiced: k → g, s → z, t → d, h → b.',
    example: 'か ka → が ga, さ sa → ざ za, は ha → ば ba',
  },
  handakuten: {
    title: 'A small circle: handakuten ゜',
    body: 'A small circle at the top right turns the h-row into a p-sound.',
    example: 'は ha → ぱ pa, ひ hi → ぴ pi',
  },
  yoon: {
    title: 'Small ゃ ゅ ょ blend in',
    body: 'A small ya, yu or yo after an i-row kana merges with it into a single syllable.',
    example: 'き ki + ゃ → きゃ kya, し shi + ょ → しょ sho',
  },
  'small-vowel': {
    title: 'Small vowels for foreign sounds',
    body: 'In katakana, a small ァ ィ ゥ ェ ォ after a kana makes sounds that Japanese doesn’t have.',
    example: 'フ fu + ァ → ファ fa, テ te + ィ → ティ ti',
  },
}

/** A note on how a kana is built, in a language (falls back to English). */
export function kanaNote(note: KanaNote, lang: Lang = 'en') {
  return (lang === 'nl' && kanaNotesNl[note]) || KANA_NOTES[note]
}

/** A memory hint for a kana in a script. */
export function mnemonicFor(kana: Kana, script: Script, lang: Lang = 'en'): string {
  const text = script === 'hiragana' && kana.hiragana ? kana.hiragana : kana.katakana
  const which = script === 'hiragana' && kana.hiragana ? 'hiragana' : 'katakana'
  const own = (lang === 'nl' && mnemonicsNl[kana.id]) || BASIC[kana.id]
  if (own) return own[which]

  const chars = [...text]
  if (chars.length === 2) {
    const base = kanaByChar(chars[0])
    const small = SMALL[chars[1]]
    if (base && small) {
      return lang === 'nl'
        ? `${chars[0]} ${base.romaji} + een kleine ${chars[1]} ${small} → één lettergreep: ${kana.romaji}.`
        : `${chars[0]} ${base.romaji} + a small ${chars[1]} ${small} → one syllable: ${kana.romaji}.`
    }
  }
  const baseChar = baseOf(chars[0])
  const base = baseChar ? kanaByChar(baseChar) : undefined
  if (base) {
    const circle = text.normalize('NFD').includes('゚')
    if (lang === 'nl') {
      const mark = circle ? 'een klein rondje (゜)' : 'twee streepjes (゛)'
      return `${baseChar} ${base.romaji} met ${mark}: dezelfde vorm, nu uitgesproken als ${kana.romaji}.`
    }
    const mark = circle ? 'a small circle (゜)' : 'two marks (゛)'
    return `${baseChar} ${base.romaji} with ${mark}: the same shape, now pronounced ${kana.romaji}.`
  }
  return ''
}

/** Render a hint as HTML-safe parts: the *starred* sound is emphasised. */
export function hintParts(hint: string): { text: string; em: boolean }[] {
  return hint
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('*') ? { text: part.slice(1, -1), em: true } : { text: part, em: false },
    )
}
