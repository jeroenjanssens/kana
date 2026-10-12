import type { Kana, Script } from './kana'
import type { DrawingMode } from '../storage/schema'

/** A traced drawing: SVG path data for its paper, tint and ink layers. */
export interface DrawingData {
  /** The kana's em box, in image pixels. */
  viewBox: string
  /** Maps the path coordinates to image pixels. */
  transform: string
  paper: string
  tint: string
  ink: string
}

/**
 * Tofugu's memory-hint drawings for the basic hiragana and katakana, traced by
 * scripts/tofugu-drawings.ts. Each is loaded on demand, as its own small chunk.
 */
const FILES = import.meta.glob<DrawingData>('./tofugu/drawings/*/*.json', { import: 'default' })

/** Loaders keyed by "script/id", e.g. "katakana/ka". */
const BY_KEY = new Map(
  Object.entries(FILES).map(([path, load]) => [path.replace(/^.*\/drawings\/|\.json$/g, ''), load]),
)

/** The kana ids that have a drawing in a script. */
export function drawingIds(script: Script): string[] {
  return [...BY_KEY.keys()].filter((k) => k.startsWith(`${script}/`)).map((k) => k.split('/')[1])
}

/** Whether a kana has a drawing in a script. */
export function hasDrawing(kana: Kana, script: Script): boolean {
  return BY_KEY.has(`${script}/${kana.id}`)
}

/** Whether to show drawings on this side of a card (the intro and details count as the back). */
export function showDrawing(mode: DrawingMode, side: 'front' | 'back'): boolean {
  return mode === 'always' || (mode === 'back' && side === 'back')
}

/** A kana's drawing in a script. */
export async function loadDrawing(id: string, script: Script): Promise<DrawingData | undefined> {
  return BY_KEY.get(`${script}/${id}`)?.()
}

/** The mode after toggling the drawing on one side, changing the setting as little as possible. */
export function toggleDrawing(mode: DrawingMode, side: 'front' | 'back'): DrawingMode {
  if (side === 'front') return mode === 'always' ? 'back' : 'always'
  return showDrawing(mode, 'back') ? 'off' : 'back'
}
