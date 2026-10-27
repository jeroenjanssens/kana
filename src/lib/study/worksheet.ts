import type { KanaGroup } from '../data/kana'
import { glyph } from '../data/kana'
import { hasStrokes } from '../data/strokes'
import { deckKana } from '../srs/queue'
import { shuffle } from '../ui/random'
import { kanaInRows, rowOptions, type RowOption } from './rows'
import { scriptsOf, type Question, type ScriptChoice, type SheetSize } from './scripts'
export { SHEET_SIZES, SHEET_STROKES, type SheetSize } from './scripts'

/** An A4 page in portrait, in millimetres. */
export const PAGE = { width: 210, height: 297, margin: 12, header: 14, footer: 6 }

/**
 * The side of a square and the distance from one row to the next (the square plus a band for the
 * romaji and the line between rows), in millimetres. Adults write at about 7–8 mm; Japanese school
 * notebooks go from about 10 mm (older pupils) to 18–22 mm (first grade).
 */
export const SHEET_MM: Record<SheetSize, { cell: number; pitch: number }> = {
  xsmall: { cell: 8, pitch: 12 },
  small: { cell: 10, pitch: 14 },
  medium: { cell: 13, pitch: 18 },
  large: { cell: 15, pitch: 20 },
  xlarge: { cell: 18, pitch: 24 },
}

/**
 * Colours for the strokes of the numbered square, in order: red, green, blue, ochre, cyan and
 * magenta. Chosen in OKLCH, with a lightness of 0.50 (the first three) to 0.62 (the others) so that
 * none fades on paper, to be as far apart as possible: every pair is at least 0.2 apart in OKLab.
 * Six is the most strokes of any kana on a worksheet (ぼ: four and two); after that they start again.
 */
export const STROKE_COLOURS = ['#ba022f', '#057918', '#414fd2', '#b27901', '#0196b0', '#c34fc2']

export function strokeColour(index: number): string {
  return STROKE_COLOURS[index % STROKE_COLOURS.length]
}

/** Tracing squares per row, after the model and the numbered one, when there's room. */
export const FADE_STEPS = 10

/** Empty squares at the end of every row, at least, to write the kana on your own. */
export const MIN_BLANKS = 2

export function cellsPerRow(size: SheetSize): number {
  return Math.floor((PAGE.width - 2 * PAGE.margin) / SHEET_MM[size].cell)
}

export function rowsPerPage(size: SheetSize): number {
  const height = PAGE.height - 2 * PAGE.margin - PAGE.header - PAGE.footer
  return Math.floor(height / SHEET_MM[size].pitch)
}

/** How dark each tracing square is, from a clear guide to a faint one. */
export function fadeOpacities(steps = FADE_STEPS, from = 0.45, to = 0.08): number[] {
  if (steps === 1) return [from]
  return Array.from({ length: steps }, (_, i) => from + ((to - from) * i) / (steps - 1))
}

export type Cell =
  { kind: 'model' } | { kind: 'numbered' } | { kind: 'trace'; opacity: number } | { kind: 'blank' }

/**
 * The squares of a row: the model, the numbered one, the tracing ones, then blank to the edge. A
 * row too short for ten traces and two blank squares gets fewer traces, that fade out quicker.
 */
export function cellKinds(size: SheetSize): Cell[] {
  const steps = Math.min(FADE_STEPS, cellsPerRow(size) - 2 - MIN_BLANKS)
  const fades = fadeOpacities(steps).map((opacity) => ({ kind: 'trace' as const, opacity }))
  const cells: Cell[] = [{ kind: 'model' }, { kind: 'numbered' }, ...fades]
  const blanks = Math.max(0, cellsPerRow(size) - cells.length)
  return [...cells, ...Array.from({ length: blanks }, () => ({ kind: 'blank' as const }))]
}

/**
 * Kana written as one character with stroke data: the basic and dakuten rows. (Yōon and extended
 * katakana are two characters; ヴ, the one single extended kana, would be a row of its own.)
 */
function single(script: 'hiragana' | 'katakana', groups: readonly KanaGroup[]) {
  const own = groups.filter((g) => g === 'basic' || g === 'dakuten')
  return deckKana(script, own).filter((k) => {
    const chars = [...glyph(k, script)]
    return chars.length === 1 && hasStrokes(chars[0])
  })
}

/** The rows to choose from. Katakana has them all, so it gives the rows for both scripts. */
export function worksheetRows(script: ScriptChoice, groups: readonly KanaGroup[]): RowOption[] {
  return rowOptions(single(script === 'hiragana' ? 'hiragana' : 'katakana', groups))
}

export interface WorksheetSetup {
  script: ScriptChoice
  /** Row keys (`basic:k`). */
  rows: readonly string[]
}

/** The kana on a worksheet, in table order: all hiragana first, then all katakana. */
export function worksheetKana(setup: WorksheetSetup, groups: readonly KanaGroup[]): Question[] {
  return scriptsOf(setup.script).flatMap((script) =>
    kanaInRows(rowOptions(single(script, groups)), setup.rows).map((kana) => ({ kana, script })),
  )
}

/** The order on the sheet: as given, or shuffled (scripts mixed). */
export function worksheetOrder(kana: readonly Question[], random: boolean, rand = Math.random) {
  return random ? shuffle(kana, rand) : [...kana]
}

/** Split items into pages of `perPage`. */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  return pages
}
