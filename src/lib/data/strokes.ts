import data from './kanjivg/strokes.json' with { type: 'json' }

export interface StrokeGlyph {
  char: string
  strokes: string[]
  numbers: [number, number][]
  /** Horizontal offset in the 109-unit grid, for multi-character kana. */
  x: number
  /** Scale (small kana are drawn at their natural KanjiVG size; this is for layout). */
  scale: number
}

const STROKES = data as unknown as Record<
  string,
  { strokes: string[]; numbers: [number, number][] }
>

export const GRID = 109

export function hasStrokes(char: string): boolean {
  return char in STROKES
}

/**
 * Stroke data for a kana (one or two characters, e.g. 'きゃ'). Each character occupies its own
 * 109-unit cell side by side, so the full drawing is `GRID * glyphs.length` wide.
 */
export function strokesFor(text: string): StrokeGlyph[] {
  return [...text].flatMap((char, i) => {
    const entry = STROKES[char]
    return entry ? [{ char, ...entry, x: i * GRID, scale: 1 }] : []
  })
}

export function strokeCount(text: string): number {
  return strokesFor(text).reduce((n, g) => n + g.strokes.length, 0)
}
