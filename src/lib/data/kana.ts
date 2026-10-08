export type Script = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'dakuten' | 'yoon' | 'extended'

export interface Kana {
  /** Unique id, based on the Hepburn romaji. Shared by the hiragana and katakana form. */
  id: string
  hiragana: string
  /** Extended katakana (ファ, ティ, …) have no hiragana form. */
  katakana: string
  /** Modified Hepburn. */
  romaji: string
  /** Kunrei-shiki. */
  kunrei: string
  /** Other accepted typed answers. */
  alt: string[]
  /** Optional display label when the romaji alone is ambiguous, e.g. を → 'o (wo)'. */
  label?: string
  group: KanaGroup
  /** Row key in the table, e.g. 'k' or 'ky'. Vowel row is 'a'. */
  row: string
  /** Column index: 0–4 for a i u e o; 0–2 for ya yu yo. */
  col: number
  /** Global learning order. */
  order: number
  /** True when a pronunciation recording is available. */
  audio: boolean
}

const VOWELS = ['a', 'i', 'u', 'e', 'o']

/** Basic rows in gojūon order. `null` marks an empty cell. */
const BASIC: [row: string, cells: ([string, string, string, string?] | null)[]][] = [
  [
    'a',
    [
      ['あ', 'ア', 'a'],
      ['い', 'イ', 'i'],
      ['う', 'ウ', 'u'],
      ['え', 'エ', 'e'],
      ['お', 'オ', 'o'],
    ],
  ],
  [
    'k',
    [
      ['か', 'カ', 'ka'],
      ['き', 'キ', 'ki'],
      ['く', 'ク', 'ku'],
      ['け', 'ケ', 'ke'],
      ['こ', 'コ', 'ko'],
    ],
  ],
  [
    's',
    [
      ['さ', 'サ', 'sa'],
      ['し', 'シ', 'shi', 'si'],
      ['す', 'ス', 'su'],
      ['せ', 'セ', 'se'],
      ['そ', 'ソ', 'so'],
    ],
  ],
  [
    't',
    [
      ['た', 'タ', 'ta'],
      ['ち', 'チ', 'chi', 'ti'],
      ['つ', 'ツ', 'tsu', 'tu'],
      ['て', 'テ', 'te'],
      ['と', 'ト', 'to'],
    ],
  ],
  [
    'n',
    [
      ['な', 'ナ', 'na'],
      ['に', 'ニ', 'ni'],
      ['ぬ', 'ヌ', 'nu'],
      ['ね', 'ネ', 'ne'],
      ['の', 'ノ', 'no'],
    ],
  ],
  [
    'h',
    [
      ['は', 'ハ', 'ha'],
      ['ひ', 'ヒ', 'hi'],
      ['ふ', 'フ', 'fu', 'hu'],
      ['へ', 'ヘ', 'he'],
      ['ほ', 'ホ', 'ho'],
    ],
  ],
  [
    'm',
    [
      ['ま', 'マ', 'ma'],
      ['み', 'ミ', 'mi'],
      ['む', 'ム', 'mu'],
      ['め', 'メ', 'me'],
      ['も', 'モ', 'mo'],
    ],
  ],
  ['y', [['や', 'ヤ', 'ya'], null, ['ゆ', 'ユ', 'yu'], null, ['よ', 'ヨ', 'yo']]],
  [
    'r',
    [
      ['ら', 'ラ', 'ra'],
      ['り', 'リ', 'ri'],
      ['る', 'ル', 'ru'],
      ['れ', 'レ', 're'],
      ['ろ', 'ロ', 'ro'],
    ],
  ],
  ['w', [['わ', 'ワ', 'wa'], null, null, null, ['を', 'ヲ', 'wo', 'o']]],
  ['nn', [['ん', 'ン', 'n'], null, null, null, null]],
]

const DAKUTEN: [row: string, cells: [string, string, string, string?][]][] = [
  [
    'g',
    [
      ['が', 'ガ', 'ga'],
      ['ぎ', 'ギ', 'gi'],
      ['ぐ', 'グ', 'gu'],
      ['げ', 'ゲ', 'ge'],
      ['ご', 'ゴ', 'go'],
    ],
  ],
  [
    'z',
    [
      ['ざ', 'ザ', 'za'],
      ['じ', 'ジ', 'ji', 'zi'],
      ['ず', 'ズ', 'zu'],
      ['ぜ', 'ゼ', 'ze'],
      ['ぞ', 'ゾ', 'zo'],
    ],
  ],
  [
    'd',
    [
      ['だ', 'ダ', 'da'],
      ['ぢ', 'ヂ', 'ji', 'zi'],
      ['づ', 'ヅ', 'zu'],
      ['で', 'デ', 'de'],
      ['ど', 'ド', 'do'],
    ],
  ],
  [
    'b',
    [
      ['ば', 'バ', 'ba'],
      ['び', 'ビ', 'bi'],
      ['ぶ', 'ブ', 'bu'],
      ['べ', 'ベ', 'be'],
      ['ぼ', 'ボ', 'bo'],
    ],
  ],
  [
    'p',
    [
      ['ぱ', 'パ', 'pa'],
      ['ぴ', 'ピ', 'pi'],
      ['ぷ', 'プ', 'pu'],
      ['ぺ', 'ペ', 'pe'],
      ['ぽ', 'ポ', 'po'],
    ],
  ],
]

/** Yōon: base i-column kana + small ya/yu/yo. [row, hiragana base, katakana base, hepburn prefix, kunrei prefix] */
const YOON: [string, string, string, string, string][] = [
  ['ky', 'き', 'キ', 'ky', 'ky'],
  ['sh', 'し', 'シ', 'sh', 'sy'],
  ['ch', 'ち', 'チ', 'ch', 'ty'],
  ['ny', 'に', 'ニ', 'ny', 'ny'],
  ['hy', 'ひ', 'ヒ', 'hy', 'hy'],
  ['my', 'み', 'ミ', 'my', 'my'],
  ['ry', 'り', 'リ', 'ry', 'ry'],
  ['gy', 'ぎ', 'ギ', 'gy', 'gy'],
  ['j', 'じ', 'ジ', 'j', 'zy'],
  ['by', 'び', 'ビ', 'by', 'by'],
  ['py', 'ぴ', 'ピ', 'py', 'py'],
]
const SMALL_Y: [string, string, string][] = [
  ['ゃ', 'ャ', 'a'],
  ['ゅ', 'ュ', 'u'],
  ['ょ', 'ョ', 'o'],
]

/** Extended katakana for loanwords. [katakana, hepburn, row, col] */
const EXTENDED: [string, string, string, number][] = [
  ['ファ', 'fa', 'f', 0],
  ['フィ', 'fi', 'f', 1],
  ['フェ', 'fe', 'f', 3],
  ['フォ', 'fo', 'f', 4],
  ['ウィ', 'wi', 'wx', 1],
  ['ウェ', 'we', 'wx', 3],
  ['ウォ', 'wo', 'wx', 4],
  ['ティ', 'ti', 'tx', 1],
  ['トゥ', 'tu', 'tx', 2],
  ['ディ', 'di', 'dx', 1],
  ['ドゥ', 'du', 'dx', 2],
  ['シェ', 'she', 'shx', 3],
  ['ジェ', 'je', 'jx', 3],
  ['チェ', 'che', 'chx', 3],
  ['ヴァ', 'va', 'v', 0],
  ['ヴィ', 'vi', 'v', 1],
  ['ヴ', 'vu', 'v', 2],
  ['ヴェ', 've', 'v', 3],
  ['ヴォ', 'vo', 'v', 4],
]

function build(): Kana[] {
  const list: Kana[] = []
  const push = (k: Omit<Kana, 'order'>) => list.push({ ...k, order: list.length })

  for (const [row, cells] of BASIC) {
    cells.forEach((cell, col) => {
      if (!cell) return
      const [hiragana, katakana, romaji, kunrei] = cell
      const isWo = romaji === 'wo'
      push({
        id: romaji,
        hiragana,
        katakana,
        romaji: isWo ? 'o' : romaji,
        kunrei: isWo ? 'o' : (kunrei ?? romaji),
        alt: isWo ? ['wo'] : kunrei ? [kunrei] : romaji === 'n' ? ['nn'] : [],
        label: isWo ? 'o (wo)' : undefined,
        group: 'basic',
        row,
        col,
        audio: true,
      })
    })
  }

  for (const [row, cells] of DAKUTEN) {
    cells.forEach(([hiragana, katakana, romaji, kunrei], col) => {
      // ぢ and づ sound like じ and ず; give them distinct ids.
      const id = row === 'd' && col === 1 ? 'di' : row === 'd' && col === 2 ? 'du' : romaji
      const alt = new Set<string>()
      if (kunrei) alt.add(kunrei)
      if (id !== romaji) alt.add(id)
      push({
        id,
        hiragana,
        katakana,
        romaji,
        kunrei: id === 'di' ? 'di' : id === 'du' ? 'du' : (kunrei ?? romaji),
        alt: [...alt],
        label: id !== romaji ? `${romaji} (${id})` : undefined,
        group: 'dakuten',
        row,
        col,
        audio: true,
      })
    })
  }

  for (const [row, hBase, kBase, hep, kun] of YOON) {
    SMALL_Y.forEach(([hSmall, kSmall, vowel], col) => {
      const romaji = hep + vowel
      const kunrei = kun + vowel
      const alt = new Set([kunrei])
      if (row === 'j') alt.add('jy' + vowel)
      if (row === 'ch') alt.add('cy' + vowel)
      alt.delete(romaji)
      push({
        id: romaji,
        hiragana: hBase + hSmall,
        katakana: kBase + kSmall,
        romaji,
        kunrei,
        alt: [...alt],
        group: 'yoon',
        row,
        col,
        audio: false,
      })
    })
  }

  for (const [katakana, romaji, row, col] of EXTENDED) {
    push({
      id: 'x-' + romaji,
      hiragana: '',
      katakana,
      romaji,
      kunrei: romaji,
      alt: [],
      group: 'extended',
      row,
      col,
      audio: false,
    })
  }

  return list
}

export const KANA: readonly Kana[] = build()

export const KANA_BY_ID: ReadonlyMap<string, Kana> = new Map(KANA.map((k) => [k.id, k]))

const BY_CHAR = new Map<string, Kana>()
for (const k of KANA) {
  if (k.hiragana) BY_CHAR.set(k.hiragana, k)
  BY_CHAR.set(k.katakana, k)
}

export function kanaById(id: string): Kana {
  const k = KANA_BY_ID.get(id)
  if (!k) throw new Error(`Unknown kana id: ${id}`)
  return k
}

/** Look up a kana by its written form (either script). */
export function kanaByChar(char: string): Kana | undefined {
  return BY_CHAR.get(char)
}

export function scriptOf(char: string): Script | undefined {
  const code = char.codePointAt(0)
  if (code === undefined) return undefined
  if (code >= 0x3040 && code <= 0x309f) return 'hiragana'
  if (code >= 0x30a0 && code <= 0x30ff) return 'katakana'
  return undefined
}

export function glyph(kana: Kana, script: Script): string {
  return script === 'hiragana' ? kana.hiragana : kana.katakana
}

/** Romaji for display in the chosen romanisation system. */
export function displayRomaji(kana: Kana, system: 'hepburn' | 'kunrei' = 'hepburn'): string {
  if (system === 'kunrei') return kana.kunrei
  return kana.label ?? kana.romaji
}

/** All typed answers that count as correct. */
export function acceptedAnswers(kana: Kana): string[] {
  return [...new Set([kana.romaji, kana.kunrei, ...kana.alt])]
}

export const ROW_LABELS: Record<string, string> = {
  a: '∅',
  nn: 'n',
}

export const BASIC_ROWS = BASIC.map(([row]) => row)
export const DAKUTEN_ROWS = DAKUTEN.map(([row]) => row)
export const YOON_ROWS = YOON.map(([row]) => row)
export const EXTENDED_ROWS = [...new Set(EXTENDED.map(([, , row]) => row))]
export const COLUMN_LABELS = VOWELS
export const YOON_COLUMN_LABELS = ['ya', 'yu', 'yo']

/** Kana in the given groups, in learning order. Extended kana are katakana-only. */
export function kanaInGroups(groups: readonly KanaGroup[], script?: Script): Kana[] {
  return KANA.filter(
    (k) => groups.includes(k.group) && (script !== 'hiragana' || k.hiragana !== ''),
  )
}

/** Rows grouped for the table / range selection, in order. */
export function rowsOf(group: KanaGroup): { row: string; kana: Kana[] }[] {
  const rows = new Map<string, Kana[]>()
  for (const k of KANA) {
    if (k.group !== group) continue
    if (!rows.has(k.row)) rows.set(k.row, [])
    rows.get(k.row)!.push(k)
  }
  return [...rows].map(([row, kana]) => ({ row, kana }))
}

/** Split a kana string into known kana units (handles yōon and extended combos). Unknown characters (っ, ー, …) are returned as-is. */
export function segment(text: string): { text: string; kana?: Kana }[] {
  const out: { text: string; kana?: Kana }[] = []
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i] + (chars[i + 1] ?? '')
    const two = chars[i + 1] ? BY_CHAR.get(pair) : undefined
    if (two) {
      out.push({ text: pair, kana: two })
      i++
      continue
    }
    out.push({ text: chars[i], kana: BY_CHAR.get(chars[i]) })
  }
  return out
}
