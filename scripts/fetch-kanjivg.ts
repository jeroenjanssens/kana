/**
 * Downloads stroke-order data for every kana from KanjiVG (CC BY-SA 3.0) and writes a compact
 * JSON file: for each character, its stroke paths in order and the stroke-number positions.
 *
 * Usage: npx tsx scripts/fetch-kanjivg.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { KANA } from '../src/lib/data/kana.ts'

const OUT_DIR = 'src/lib/data/kanjivg'
const RAW = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/'

export interface StrokeData {
  /** SVG path data per stroke, in writing order (109 × 109 viewBox). */
  strokes: string[]
  /** Position of each stroke number. */
  numbers: [number, number][]
}

export function parseKanjiVg(svg: string): StrokeData {
  const strokes = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  const numbers = [...svg.matchAll(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  )
  return { strokes, numbers }
}

/** Every single character we need: all kana components plus small kana, っ and ー. */
export function characters(): string[] {
  const chars = new Set<string>()
  for (const k of KANA) for (const c of k.hiragana + k.katakana) chars.add(c)
  for (const c of 'っッー') chars.add(c)
  return [...chars].sort()
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const data: Record<string, StrokeData> = {}
  for (const char of characters()) {
    const code = char.codePointAt(0)!.toString(16).padStart(5, '0')
    const res = await fetch(`${RAW}${code}.svg`)
    if (!res.ok) {
      console.warn(`No KanjiVG data for ${char} (${code})`)
      continue
    }
    data[char] = parseKanjiVg(await res.text())
  }
  writeFileSync(`${OUT_DIR}/strokes.json`, JSON.stringify(data) + '\n')
  console.log(`Wrote stroke data for ${Object.keys(data).length} characters`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
