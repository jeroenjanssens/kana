export type FontStyle = 'gothic' | 'mincho' | 'textbook' | 'rounded' | 'brush' | 'display'

export interface KanaFont {
  id: string
  /** CSS font-family name used for the subset. */
  family: string
  /** Human-readable name. */
  name: string
  style: FontStyle
  /** Path of the source font in the google/fonts repository. */
  source: string
  /** License file in google/fonts, when not next to the source. */
  licenseSource?: string
  /** Pin the weight axis when the source is a variable font. */
  weight?: number
  license: 'OFL-1.1' | 'Apache-2.0'
}

export const FONT_STYLES: Record<FontStyle, string> = {
  gothic: 'Gothic',
  mincho: 'Mincho',
  textbook: 'Textbook',
  rounded: 'Rounded',
  brush: 'Brush',
  display: 'Display',
}

export const FONTS: readonly KanaFont[] = [
  {
    id: 'noto-sans-jp',
    family: 'Kana Noto Sans JP',
    name: 'Noto Sans JP',
    style: 'gothic',
    source: 'ofl/notosansjp/NotoSansJP[wght].ttf',
    weight: 400,
    license: 'OFL-1.1',
  },
  {
    id: 'm-plus-1p',
    family: 'Kana M PLUS 1p',
    name: 'M PLUS 1p',
    style: 'gothic',
    source: 'ofl/mplus1p/MPLUS1p-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'noto-serif-jp',
    family: 'Kana Noto Serif JP',
    name: 'Noto Serif JP',
    style: 'mincho',
    source: 'ofl/notoserifjp/NotoSerifJP[wght].ttf',
    weight: 400,
    license: 'OFL-1.1',
  },
  {
    id: 'shippori-mincho',
    family: 'Kana Shippori Mincho',
    name: 'Shippori Mincho',
    style: 'mincho',
    source: 'ofl/shipporimincho/ShipporiMincho-Medium.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'klee-one',
    family: 'Kana Klee One',
    name: 'Klee One',
    style: 'textbook',
    source: 'ofl/kleeone/KleeOne-SemiBold.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'yomogi',
    family: 'Kana Yomogi',
    name: 'Yomogi',
    style: 'textbook',
    source: 'ofl/yomogi/Yomogi-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'zen-maru-gothic',
    family: 'Kana Zen Maru Gothic',
    name: 'Zen Maru Gothic',
    style: 'rounded',
    source: 'ofl/zenmarugothic/ZenMaruGothic-Medium.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'kosugi-maru',
    family: 'Kana Kosugi Maru',
    name: 'Kosugi Maru',
    style: 'rounded',
    source: 'apache/kosugimaru/KosugiMaru-Regular.ttf',
    license: 'Apache-2.0',
  },
  {
    id: 'm-plus-rounded-1c',
    family: 'Kana M PLUS Rounded 1c',
    name: 'M PLUS Rounded 1c',
    style: 'rounded',
    source: 'ofl/mplusrounded1c/MPLUSRounded1c-Regular.ttf',
    licenseSource: 'ofl/mplus1p/OFL.txt',
    license: 'OFL-1.1',
  },
  {
    id: 'yuji-syuku',
    family: 'Kana Yuji Syuku',
    name: 'Yuji Syuku',
    style: 'brush',
    source: 'ofl/yujisyuku/YujiSyuku-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'yuji-mai',
    family: 'Kana Yuji Mai',
    name: 'Yuji Mai',
    style: 'brush',
    source: 'ofl/yujimai/YujiMai-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'dela-gothic-one',
    family: 'Kana Dela Gothic One',
    name: 'Dela Gothic One',
    style: 'display',
    source: 'ofl/delagothicone/DelaGothicOne-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'rocknroll-one',
    family: 'Kana RocknRoll One',
    name: 'RocknRoll One',
    style: 'display',
    source: 'ofl/rocknrollone/RocknRollOne-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'hachi-maru-pop',
    family: 'Kana Hachi Maru Pop',
    name: 'Hachi Maru Pop',
    style: 'display',
    source: 'ofl/hachimarupop/HachiMaruPop-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    id: 'dotgothic16',
    family: 'Kana DotGothic16',
    name: 'DotGothic16',
    style: 'display',
    source: 'ofl/dotgothic16/DotGothic16-Regular.ttf',
    license: 'OFL-1.1',
  },
]

/** The font used for the UI's Japanese headings and as the default card font. */
export const DEFAULT_FONT_ID = 'klee-one'
export const HEADING_FONT_ID = 'shippori-mincho'

/** Pseudo-font that uses whatever Japanese font the operating system provides. */
export const SYSTEM_FONT_ID = 'system'
export const SYSTEM_FONT_STACK =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", sans-serif'

/** Kanji used in the UI (logo, headings, seals). Included in every font subset. */
export const UI_KANJI =
  '仮名平片習熟学練読聞書字日本語音覚新復終完了合格対組感謝似結果取迷子設定記録清濁半拗外来五十図'

const FONTS_BY_ID = new Map(FONTS.map((f) => [f.id, f]))

export function fontById(id: string): KanaFont | undefined {
  return FONTS_BY_ID.get(id)
}

export function fontUrl(font: KanaFont, base: string): string {
  return `${base}fonts/${font.id}.woff2`
}

/** CSS font-family value for a font id, falling back to the system stack. */
export function fontFamily(id: string): string {
  const font = fontById(id)
  return font ? `"${font.family}", ${SYSTEM_FONT_STACK}` : SYSTEM_FONT_STACK
}

/** Pick a random font id from the enabled ones, avoiding `previous` when possible. */
export function randomFontId(enabled: readonly string[], previous?: string, rand = Math.random) {
  const pool = enabled.length > 1 ? enabled.filter((id) => id !== previous) : enabled
  if (pool.length === 0) return DEFAULT_FONT_ID
  return pool[Math.floor(rand() * pool.length)]
}
