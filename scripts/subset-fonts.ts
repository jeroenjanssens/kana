/**
 * Downloads the Japanese fonts from the google/fonts repository and subsets them to kana,
 * Latin, punctuation and the handful of kanji the UI uses. Writes public/fonts/{id}.woff2.
 *
 * Usage: npx tsx scripts/subset-fonts.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import subsetFont from 'subset-font'
import { FONTS, UI_KANJI } from '../src/lib/data/fonts.ts'

const SOURCE_DIR = 'scripts/font-sources'
const OUT_DIR = 'public/fonts'
const RAW = 'https://raw.githubusercontent.com/google/fonts/main/'

function range(from: number, to: number): string {
  let out = ''
  for (let c = from; c <= to; c++) out += String.fromCodePoint(c)
  return out
}

/** Every character a card, table or heading may show. */
export function subsetText(): string {
  return [
    range(0x20, 0x7e), // ASCII
    'āīūēōĀĪŪĒŌ·—–…‘’“”',
    range(0x3000, 0x303f), // CJK punctuation
    range(0x3041, 0x309f), // hiragana
    range(0x30a0, 0x30ff), // katakana
    UI_KANJI,
  ].join('')
}

async function fetchCached(path: string): Promise<Buffer> {
  const local = join(SOURCE_DIR, path)
  if (!existsSync(local)) {
    const res = await fetch(RAW + path.replace('[', '%5B').replace(']', '%5D'))
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${path}`)
    mkdirSync(dirname(local), { recursive: true })
    writeFileSync(local, Buffer.from(await res.arrayBuffer()))
  }
  return readFileSync(local)
}

async function main() {
  mkdirSync(join(OUT_DIR, 'licenses'), { recursive: true })
  const text = subsetText()
  for (const font of FONTS) {
    const source = await fetchCached(font.source)
    const woff2 = await subsetFont(source, text, {
      targetFormat: 'woff2',
      ...(font.weight ? { variationAxes: { wght: font.weight } } : {}),
    })
    writeFileSync(join(OUT_DIR, `${font.id}.woff2`), woff2)
    const licenseFile = font.license === 'OFL-1.1' ? 'OFL.txt' : 'LICENSE.txt'
    const license = await fetchCached(font.licenseSource ?? join(dirname(font.source), licenseFile))
    writeFileSync(join(OUT_DIR, 'licenses', `${font.id}.txt`), license)
    console.log(`${font.id.padEnd(20)} ${(woff2.length / 1024).toFixed(0).padStart(4)} KB`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
