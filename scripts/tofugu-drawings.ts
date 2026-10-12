/**
 * Extracts the memory-hint drawings from Tofugu's Learn Hiragana and Learn Katakana books
 * (https://www.tofugu.com/japanese/learn-hiragana-book/,
 * https://www.tofugu.com/japanese/learn-katakana-book/) and traces them into SVGs whose layers
 * (paper, tint and ink) the app colours with its own palette.
 *
 * Every kana page has the kana in bold, a drawing over a pale copy of it, and stroke-order
 * images. The drawing is split into layers by colour, upscaled and traced with potrace; the bold
 * kana is matched against it to find where the kana sits, so all drawings share one em box.
 *
 * Needs poppler and potrace: brew install poppler potrace
 *
 * Usage:
 *   npx tsx scripts/tofugu-drawings.ts            # write src/lib/data/tofugu/drawings/{script}/{id}.json
 *   npx tsx scripts/tofugu-drawings.ts --preview  # also build drawings-preview/index.html
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import type { DrawingData } from '../src/lib/data/drawings.ts'
import { kanaByChar, type Script } from '../src/lib/data/kana.ts'

interface Book {
  script: Script
  url: string
  sha256: string
}

const BOOKS: Book[] = [
  {
    script: 'hiragana',
    url: 'https://files.tofugu.com/articles/japanese/2022-07-05-learn-hiragana-book-pdf/tofugu-learn-hiragana-book.pdf',
    sha256: '64b04b169b26b66a23476df87ccdd625a91203af3da510ea77f8e25295289914',
  },
  {
    script: 'katakana',
    url: 'https://files.tofugu.com/articles/japanese/2022-08-23-learn-katakana-book-pdf/learn-katakana-book-by-tofugu.pdf',
    sha256: 'efd7ee27650a7e1fb1c20ca21b50b2e1598bfac9b0f9752500df9ccdb437fc1f',
  },
]

const SOURCE_DIR = 'scripts/tofugu-source'
const OUT_DIR = 'src/lib/data/tofugu/drawings'
const PREVIEW_DIR = 'drawings-preview'

/** Upscaling before tracing, for smooth curves from the 150 ppi images. */
const UPSCALE = 3
/** potrace curve optimisation tolerance: higher gives smaller files with looser curves. */
const OPTTOLERANCE = '1'
/** The book's kana size in image pixels (one em), so every drawing gets the same scale. */
const EM = 330

/** The pure colours in the drawings: ink, the pale-blue tint, and white paper. */
const TINT = [180, 227, 255] as const

interface Bitmap {
  width: number
  height: number
  /** Coverage per pixel, 0–1. */
  data: Float32Array
}

interface ImageInfo {
  page: number
  /** Index of the image on its page (as numbered by pdfimages). */
  index: number
  width: number
  height: number
  rgb: Buffer
  alpha: Buffer
}

export interface Drawing {
  char: string
  id: string
  page: number
  /** Where the bold kana's box sits in the drawing, in image pixels. */
  kana: { x: number; y: number; width: number; height: number }
  width: number
  height: number
  data: DrawingData
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

async function ensurePdf(book: Book): Promise<string> {
  mkdirSync(SOURCE_DIR, { recursive: true })
  const file = join(SOURCE_DIR, book.url.replace(/^.*\//, ''))
  if (!existsSync(file)) {
    console.log(`Downloading ${book.url}`)
    const res = await fetch(book.url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
  if (hash !== book.sha256) {
    throw new Error(`Unexpected PDF (sha256 ${hash}); the drawings may have moved`)
  }
  return file
}

/**
 * The kana each page teaches: the first character of the "how to pronounce" text ("あ is
 * pronounced…"). The heading itself can't be trusted: in the katakana book most read テ.
 */
function kanaPages(pdf: string): Map<number, string> {
  const pages = run('pdftotext', ['-layout', pdf, '-']).split('\f')
  const out = new Map<number, string>()
  pages.forEach((text, i) => {
    const m = text.match(/how to pronounce \S\s*\n\s*(\S)/)
    if (m) out.set(i + 1, m[1])
  })
  return out
}

/** All images on a page with their soft masks, as raw RGB and alpha. */
async function pageImages(pdf: string, page: number, tmp: string): Promise<ImageInfo[]> {
  const rows = run('pdfimages', ['-list', '-f', `${page}`, '-l', `${page}`, pdf])
    .split('\n')
    .slice(2)
    .map((l) => l.trim().split(/\s+/))
    .filter((r) => r.length > 4)
  const dir = join(tmp, `p${page}`)
  mkdirSync(dir, { recursive: true })
  run('pdfimages', ['-png', '-f', `${page}`, '-l', `${page}`, pdf, join(dir, 'i')])
  const files = readdirSync(dir).sort()
  const images: ImageInfo[] = []
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][2] !== 'image' || rows[i + 1]?.[2] !== 'smask') continue
    const rgb = await sharp(join(dir, files[i]))
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer()
    const width = Number(rows[i][3])
    const height = Number(rows[i][4])
    // A soft mask can have another size than its image (at another resolution).
    const alpha = await sharp(join(dir, files[i + 1]))
      .greyscale()
      .resize(width, height, { fit: 'fill' })
      .extractChannel(0)
      .raw()
      .toBuffer()
    images.push({
      page,
      index: i,
      width,
      height,
      rgb: rgb.subarray(0, width * height * 3),
      alpha,
    })
  }
  return images
}

/** Share of visible pixels that are ink, bold kana blue, or stroke-order pink. */
function colourStats(img: ImageInfo) {
  let visible = 0
  let ink = 0
  let bold = 0
  let pink = 0
  for (let p = 0; p < img.width * img.height; p++) {
    if (img.alpha[p] < 128) continue
    visible++
    const [r, g, b] = [img.rgb[p * 3], img.rgb[p * 3 + 1], img.rgb[p * 3 + 2]]
    if (b < 70) ink++
    else if (r < 140 && g > 150 && g < 215 && b > 220) bold++
    else if (r > 200 && g < 160 && b < 200) pink++
  }
  return { ink: ink / visible, bold: bold / visible, pink: pink / visible }
}

/** Picks the drawing and the bold kana from a page's images. */
function classify(images: ImageInfo[], char: string) {
  const big = images
    .filter((i) => i.width > 150 && i.height > 150 && i.width < 700 && i.height < 700)
    .map((img) => ({ img, ...colourStats(img) }))
  const drawings = big.filter((i) => i.ink > 0.02 && i.pink < 0.005)
  const bolds = big.filter((i) => i.bold > 0.7 && i.ink < 0.01 && i.pink < 0.005)
  if (drawings.length !== 1 || bolds.length < 1) {
    const found = big.map((i) => `#${i.img.index} ${i.img.width}×${i.img.height}`).join(', ')
    throw new Error(`${char}: expected one drawing and a bold kana, found ${found}`)
  }
  return { drawing: drawings[0].img, bold: bolds[0].img }
}

/**
 * Splits a drawing into ink, tint and paper coverage. Each pixel is treated as a mix of black,
 * the tint and white: blue separates ink from the rest, red separates tint from white.
 */
export function separate(img: ImageInfo): { ink: Bitmap; tint: Bitmap; paper: Bitmap } {
  const n = img.width * img.height
  const ink = new Float32Array(n)
  const tint = new Float32Array(n)
  const paper = new Float32Array(n)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  for (let p = 0; p < n; p++) {
    const a = img.alpha[p] / 255
    const r = img.rgb[p * 3]
    const b = img.rgb[p * 3 + 2]
    const light = clamp(b / 255)
    const white = clamp((r - TINT[0] * light) / (255 - TINT[0]))
    const pale = clamp(light - white)
    // Painted bottom to top, so each layer also covers the ones above it.
    ink[p] = a * (1 - light)
    tint[p] = a * (1 - light + pale)
    paper[p] = a
  }
  const bitmap = (data: Float32Array) => ({ width: img.width, height: img.height, data })
  return { ink: bitmap(ink), tint: bitmap(tint), paper: bitmap(paper) }
}

/** The bounding box of the visible pixels. */
function bbox(img: ImageInfo) {
  let [x0, y0, x1, y1] = [img.width, img.height, -1, -1]
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.alpha[y * img.width + x] < 128) continue
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/**
 * Finds where the bold kana lies in the drawing (same scale: both are placed at 150 ppi). A good
 * position puts the kana over pale pixels, and not over transparency or outside the image.
 */
export function locate(bold: ImageInfo, drawing: ImageInfo): { x: number; y: number } {
  const W = drawing.width
  const H = drawing.height
  const pale = new Int8Array(W * H)
  const empty = new Int8Array(W * H)
  for (let p = 0; p < W * H; p++) {
    const [r, b] = [drawing.rgb[p * 3], drawing.rgb[p * 3 + 2]]
    if (drawing.alpha[p] > 128 && b > 200 && r > 120 && r < 230) pale[p] = 1
    if (drawing.alpha[p] < 50) empty[p] = 1
  }
  const kana: [number, number][] = []
  for (let y = 0; y < bold.height; y++) {
    for (let x = 0; x < bold.width; x++) if (bold.alpha[y * bold.width + x] > 128) kana.push([x, y])
  }
  const score = (ox: number, oy: number, step: number) => {
    let s = 0
    for (let i = 0; i < kana.length; i += step) {
      const x = kana[i][0] + ox
      const y = kana[i][1] + oy
      if (x < 0 || y < 0 || x >= W || y >= H) s -= 2
      else if (pale[y * W + x]) s += 1
      else if (empty[y * W + x]) s -= 2
    }
    return s
  }
  let best = { s: -Infinity, x: 0, y: 0 }
  for (let oy = -Math.floor(bold.height / 2); oy < H - bold.height / 2; oy += 3) {
    for (let ox = -Math.floor(bold.width / 2); ox < W - bold.width / 2; ox += 3) {
      const s = score(ox, oy, 7)
      if (s > best.s) best = { s, x: ox, y: oy }
    }
  }
  const coarse = best
  best = { s: -Infinity, x: 0, y: 0 }
  for (let oy = coarse.y - 4; oy <= coarse.y + 4; oy++) {
    for (let ox = coarse.x - 4; ox <= coarse.x + 4; ox++) {
      const s = score(ox, oy, 1)
      if (s > best.s) best = { s, x: ox, y: oy }
    }
  }
  return { x: best.x, y: best.y }
}

/** Traces a coverage map with potrace and returns SVG path data in image pixels. */
async function trace(bitmap: Bitmap, tmp: string): Promise<string> {
  const w = bitmap.width * UPSCALE
  const h = bitmap.height * UPSCALE
  // potrace traces dark pixels, so ink is written as black.
  const grey = Buffer.alloc(bitmap.width * bitmap.height)
  for (let p = 0; p < grey.length; p++) grey[p] = Math.round(255 * (1 - bitmap.data[p]))
  const big = await sharp(grey, {
    raw: { width: bitmap.width, height: bitmap.height, channels: 1 },
  })
    .resize(w, h, { kernel: 'lanczos3' })
    .extractChannel(0)
    .raw()
    .toBuffer()
  const pgm = join(tmp, 'layer.pgm')
  writeFileSync(pgm, Buffer.concat([Buffer.from(`P5\n${w} ${h}\n255\n`), big]))
  const svg = run('potrace', [
    '-b',
    'svg',
    '--flat',
    '-k',
    '0.5',
    '-t',
    '4',
    '-O',
    OPTTOLERANCE,
    '-u',
    '1',
    '-o',
    '-',
    pgm,
  ])
  const d = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ')).join('')
  return d
}

/** The potrace coordinates (upscaled, y up) mapped to image pixels. */
function pathTransform(height: number) {
  const s = 1 / UPSCALE
  return `matrix(${s} 0 0 ${-s} 0 ${height})`
}

async function extract(pdf: string, char: string, page: number, tmp: string): Promise<Drawing> {
  const kana = kanaByChar(char)
  if (!kana) throw new Error(`Unknown kana ${char}`)
  const { drawing, bold } = classify(await pageImages(pdf, page, tmp), char)
  const box = bbox(bold)
  const at = locate(bold, drawing)
  const layers = separate(drawing)
  const cx = at.x + box.x + box.width / 2
  const cy = at.y + box.y + box.height / 2
  const data: DrawingData = {
    viewBox: [cx - EM / 2, cy - EM / 2, EM, EM].map((v) => +v.toFixed(1)).join(' '),
    transform: pathTransform(drawing.height),
    paper: await trace(layers.paper, tmp),
    tint: await trace(layers.tint, tmp),
    ink: await trace(layers.ink, tmp),
  }
  return {
    char,
    id: kana.id,
    page,
    kana: { x: at.x + box.x, y: at.y + box.y, width: box.width, height: box.height },
    width: drawing.width,
    height: drawing.height,
    data,
  }
}

/** The original drawing as a PNG data URL, for the preview page. */
async function originalPng(pdf: string, page: number, tmp: string, char: string) {
  const { drawing } = classify(await pageImages(pdf, page, tmp), char)
  const rgba = Buffer.alloc(drawing.width * drawing.height * 4)
  for (let p = 0; p < drawing.width * drawing.height; p++) {
    rgba[p * 4] = drawing.rgb[p * 3]
    rgba[p * 4 + 1] = drawing.rgb[p * 3 + 1]
    rgba[p * 4 + 2] = drawing.rgb[p * 3 + 2]
    rgba[p * 4 + 3] = drawing.alpha[p]
  }
  const png = await sharp(rgba, {
    raw: { width: drawing.width, height: drawing.height, channels: 4 },
  })
    .png()
    .toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

/** A drawing as standalone SVG markup, for the preview page. */
function svgMarkup(d: DrawingData): string {
  const paths = (['paper', 'tint', 'ink'] as const).map((n) => `<path class="${n}" d="${d[n]}"/>`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" overflow="visible">` +
    `<g transform="${d.transform}">${paths.join('')}</g></svg>`
  )
}

function previewPage(cells: string[]): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>kana — drawing preview</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 2rem; background: #ebe3d4; color: #1c1b19; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(560px, 1fr)); gap: 1rem; }
  .cell { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; background: #fff8;
    padding: 0.6rem; border-radius: 10px; }
  .cell h2 { grid-column: 1 / -1; margin: 0; font-size: 1rem; }
  .box { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px;
    overflow: hidden; }
  .box img { width: 90%; height: 90%; object-fit: contain; }
  .light { background: #f4efe6; --ink: #1c1b19; --tint: color-mix(in srgb, #264a6e 22%, #f4efe6); --paper: #f4efe6; }
  .dark { background: #2a2722; --ink: #efe7d8; --tint: color-mix(in srgb, #8fb3d9 30%, #2a2722); --paper: #2a2722; }
  .box svg { width: 70%; height: 70%; overflow: visible; }
  .box .em { position: absolute; width: 70%; height: 70%; outline: 1px dashed #c73e1d66; }
  .paper { fill: var(--paper); } .tint { fill: var(--tint); } .ink { fill: var(--ink); }
</style></head><body>
<h1>Tofugu drawings: original, and traced in the light and dark theme</h1>
<p>The dashed square is the em box the kana is drawn in (overflow is allowed).</p>
<div class="grid">${cells.join('\n')}</div>
</body></html>
`
}

async function main() {
  const tmp = join(SOURCE_DIR, 'tmp')
  rmSync(OUT_DIR, { recursive: true, force: true })
  const preview = process.argv.includes('--preview')
  const cells: string[] = []
  for (const book of BOOKS) {
    const pdf = await ensurePdf(book)
    rmSync(tmp, { recursive: true, force: true })
    const dir = join(OUT_DIR, book.script)
    mkdirSync(dir, { recursive: true })
    const pages = kanaPages(pdf)
    if (pages.size !== 46) throw new Error(`${book.script}: found ${pages.size} kana pages, not 46`)
    for (const [page, char] of pages) {
      const d = await extract(pdf, char, page, tmp)
      const json = JSON.stringify(d.data) + '\n'
      writeFileSync(join(dir, `${d.id}.json`), json)
      console.log(
        `${char} ${d.id}: page ${page}, kana at ${d.kana.x},${d.kana.y}, ${(json.length / 1024).toFixed(1)} KB`,
      )
      if (preview) {
        const original = await originalPng(pdf, page, tmp, char)
        cells.push(
          `<section class="cell"><h2>${char} ${d.id} · page ${page}</h2>` +
            `<div class="box"><img src="${original}" alt=""></div>` +
            `<div class="box light"><span class="em"></span>${svgMarkup(d.data)}</div>` +
            `<div class="box dark"><span class="em"></span>${svgMarkup(d.data)}</div></section>`,
        )
      }
    }
  }
  if (preview) {
    mkdirSync(PREVIEW_DIR, { recursive: true })
    writeFileSync(join(PREVIEW_DIR, 'index.html'), previewPage(cells))
    console.log(`Wrote ${PREVIEW_DIR}/index.html`)
  }
  rmSync(tmp, { recursive: true, force: true })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
