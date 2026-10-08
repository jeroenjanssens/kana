import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface PhotoMeta {
  slug: string
  title: string
  photographer: string
  photographerUrl: string
  sourceUrl: string
  downloadUrl: string
  license: string
  location: string
}

interface CreditEntry {
  slug: string
  title: string
  photographer: string
  photographerUrl: string
  sourceUrl: string
  license: string
  location: string
  color: string
  width: number
  height: number
}

const WIDTHS = [640, 1280, 1920]
const TARGET_ASPECT = 3 / 2 // width / height
const SOURCES_DIR = join(__dirname, 'photo-sources')
const PUBLIC_DIR = join(__dirname, '..', 'public', 'photos')
const PHOTOS_JSON = join(__dirname, 'photos.json')

async function downloadPhoto(url: string, dest: string): Promise<void> {
  console.log(`  Downloading ${url}`)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'kana-photos/1.0 (+https://github.com/jeroenjanssens/kana)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const buf = await res.arrayBuffer()
  writeFileSync(dest, Buffer.from(buf))
  console.log(`  Saved ${dest} (${(buf.byteLength / 1024).toFixed(0)} KB)`)
}

function averageColor(data: Buffer, channels: number): string {
  let r = 0,
    g = 0,
    b = 0
  const pixels = data.length / channels
  for (let i = 0; i < data.length; i += channels) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const toHex = (v: number) =>
    Math.round(v / pixels)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function processPhoto(meta: PhotoMeta): Promise<CreditEntry> {
  const srcPath = join(SOURCES_DIR, `${meta.slug}.jpg`)

  if (!existsSync(srcPath)) {
    await downloadPhoto(meta.downloadUrl, srcPath)
  } else {
    console.log(`  Using cached ${meta.slug}.jpg`)
  }

  const { width: srcW, height: srcH } = await sharp(srcPath).metadata()
  if (!srcW || !srcH) throw new Error(`Cannot read dimensions for ${meta.slug}`)

  // Compute centre crop to TARGET_ASPECT (3:2)
  const srcAspect = srcW / srcH
  let cropW: number, cropH: number
  if (srcAspect > TARGET_ASPECT) {
    cropH = srcH
    cropW = Math.round(srcH * TARGET_ASPECT)
  } else {
    cropW = srcW
    cropH = Math.round(srcW / TARGET_ASPECT)
  }
  const left = Math.floor((srcW - cropW) / 2)
  const top = Math.floor((srcH - cropH) / 2)

  // Crop once to an in-memory buffer so each width-resize reads from RAM
  const croppedBuf = await sharp(srcPath)
    .extract({ left, top, width: cropW, height: cropH })
    .toBuffer()

  let color = '#888888'
  const finalWidth = WIDTHS[WIDTHS.length - 1]
  let finalHeight = Math.round(finalWidth / TARGET_ASPECT)

  for (const w of WIDTHS) {
    const h = Math.round(w / TARGET_ASPECT)
    const resizedBuf = await sharp(croppedBuf).resize(w, h).toBuffer()

    await sharp(resizedBuf)
      .avif({ quality: 50 })
      .toFile(join(PUBLIC_DIR, `${meta.slug}-${w}.avif`))

    await sharp(resizedBuf)
      .webp({ quality: 72 })
      .toFile(join(PUBLIC_DIR, `${meta.slug}-${w}.webp`))

    if (w === finalWidth) {
      finalHeight = h
      // Compute average colour from a thumbnail
      const { data, info } = await sharp(croppedBuf)
        .resize(50, Math.round(50 / TARGET_ASPECT))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      color = averageColor(data, info.channels)
    }
  }

  return {
    slug: meta.slug,
    title: meta.title,
    photographer: meta.photographer,
    photographerUrl: meta.photographerUrl,
    sourceUrl: meta.sourceUrl,
    license: meta.license,
    location: meta.location,
    color,
    width: finalWidth,
    height: finalHeight,
  }
}

async function main(): Promise<void> {
  mkdirSync(SOURCES_DIR, { recursive: true })
  mkdirSync(PUBLIC_DIR, { recursive: true })

  const photos: PhotoMeta[] = JSON.parse(readFileSync(PHOTOS_JSON, 'utf-8'))
  console.log(`Processing ${photos.length} photos...`)

  const credits: CreditEntry[] = []

  for (const meta of photos) {
    console.log(`\n[${credits.length + 1}/${photos.length}] ${meta.slug}`)
    const entry = await processPhoto(meta)
    credits.push(entry)
    console.log(`  color=${entry.color}  size=${entry.width}x${entry.height}`)
  }

  const creditsPath = join(PUBLIC_DIR, 'credits.json')
  writeFileSync(creditsPath, JSON.stringify(credits, null, 2))
  console.log(`\nWrote ${creditsPath} with ${credits.length} entries`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
