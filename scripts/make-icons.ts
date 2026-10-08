/**
 * Draws the app icon — a red hanko-style seal with あ in brush strokes (from KanjiVG) — and
 * renders it to PNG in the sizes a PWA needs.
 *
 * Usage: npx tsx scripts/make-icons.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { strokesFor } from '../src/lib/data/strokes.ts'

const OUT = 'public/icons'

export function iconSvg({ maskable = false }: { maskable?: boolean } = {}): string {
  const strokes = strokesFor('あ')[0].strokes
  // Maskable icons need the content inside the 80% safe zone and a full-bleed background.
  const pad = maskable ? 0 : 24
  const radius = maskable ? 0 : 96
  const scale = maskable ? 3.2 : 3.6
  const offset = (512 - 109 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
  </defs>
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="${radius}" fill="#c73e1d"/>
  ${maskable ? '' : `<rect x="${pad + 22}" y="${pad + 22}" width="${512 - pad * 2 - 44}" height="${512 - pad * 2 - 44}" rx="${radius - 20}" fill="none" stroke="#f4efe6" stroke-width="10" opacity="0.9" filter="url(#rough)"/>`}
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#f4efe6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough)">
    ${strokes.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>`
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const svg = Buffer.from(iconSvg())
  const maskable = Buffer.from(iconSvg({ maskable: true }))
  writeFileSync('public/favicon.svg', iconSvg())
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(`${OUT}/icon-${size}.png`)
    await sharp(maskable).resize(size, size).png().toFile(`${OUT}/maskable-${size}.png`)
  }
  await sharp(svg)
    .resize(180, 180)
    .flatten({ background: '#f4efe6' })
    .png()
    .toFile(`${OUT}/apple-touch-icon.png`)
  console.log('Icons written to', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
