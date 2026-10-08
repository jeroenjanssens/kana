import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const ROOT = path.resolve(__dirname, '..')
const SOURCES = path.join(__dirname, 'sfx-sources')
const OUTPUT = path.join(ROOT, 'public', 'sfx')

interface Trim {
  start: number
  duration: number
}

interface SfxEntry {
  id: string
  event: string
  title: string
  author: string
  sourceUrl: string
  downloadUrl?: string
  license: string
  trim?: Trim
  gainDb?: number
  rootHz?: number
  generate?: string
}

function ffRun(args: string[]): { ok: boolean; stderr: string } {
  const r = spawnSync(FFMPEG, args, { maxBuffer: 100 * 1024 * 1024, stdio: 'pipe' })
  return {
    ok: r.status === 0,
    stderr: r.stderr?.toString() ?? '',
  }
}

function ff(args: string[]): void {
  const r = ffRun(args)
  if (!r.ok) {
    throw new Error(`ffmpeg ${args.slice(0, 4).join(' ')} failed:\n${r.stderr}`)
  }
}

function getDuration(file: string): number {
  const r = spawnSync(
    FFPROBE,
    [
      '-v',
      'quiet',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ],
    { maxBuffer: 1024 * 1024 },
  )
  return parseFloat(r.stdout?.toString().trim() ?? '0')
}

function getMaxVolume(file: string): number {
  const r = ffRun(['-i', file, '-af', 'volumedetect', '-f', 'null', '/dev/null'])
  const m = r.stderr.match(/max_volume:\s*([-\d.]+)\s*dB/)
  if (!m) throw new Error(`Could not measure volume of ${file}`)
  return parseFloat(m[1])
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`    fetching ${url.split('/').slice(-1)[0]}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

async function buildRawWav(e: SfxEntry, rawWav: string): Promise<void> {
  if (e.generate) {
    // Synthesize via lavfi source (duration baked into the aevalsrc d= param)
    ff(['-f', 'lavfi', '-i', e.generate, '-ar', '44100', '-ac', '1', '-y', rawWav])
    return
  }

  if (!e.downloadUrl) throw new Error(`${e.id}: no downloadUrl or generate field`)

  const srcMp3 = path.join(SOURCES, `${e.id}-src.mp3`)
  if (!fs.existsSync(srcMp3)) {
    await downloadFile(e.downloadUrl, srcMp3)
  }

  // Input seeking args (fast, accurate enough for > 0.1s offsets)
  const seekArgs: string[] = []
  if (e.trim && e.trim.start > 0) seekArgs.push('-ss', String(e.trim.start))
  const durArgs: string[] = []
  if (e.trim?.duration) durArgs.push('-t', String(e.trim.duration))

  ff([
    ...seekArgs,
    '-i',
    srcMp3,
    ...durArgs,
    '-af',
    'silenceremove=start_periods=1:start_threshold=-50dB',
    '-ar',
    '44100',
    '-ac',
    '1',
    '-y',
    rawWav,
  ])
}

async function processEntry(e: SfxEntry): Promise<{ dur: number; kb: number; gain: number }> {
  const rawWav = path.join(SOURCES, `${e.id}-raw.wav`)
  const outMp3 = path.join(OUTPUT, `${e.id}.mp3`)

  // ── Step 1: produce trimmed, silence-removed mono WAV ────────────────────
  if (!fs.existsSync(rawWav)) {
    await buildRawWav(e, rawWav)
  }

  // ── Step 2: fade + normalize + encode ───────────────────────────────────
  const dur = getDuration(rawWav)

  // Fade-out: ticks get a tiny 10ms tail, others up to 150ms
  const fadeOutDur = e.event === 'tick' ? 0.01 : parseFloat(Math.min(0.15, dur * 0.12).toFixed(4))
  const fadeOutStart = parseFloat(Math.max(0, dur - fadeOutDur).toFixed(4))

  // Peak-normalize: ticks → -26 dBFS, all others → -12 dBFS
  const targetPeak = e.event === 'tick' ? -26 : -12
  const measured = getMaxVolume(rawWav)
  const gainDb = parseFloat((targetPeak - measured + (e.gainDb ?? 0)).toFixed(2))

  const filter = [
    'afade=t=in:st=0:d=0.005',
    `afade=t=out:st=${fadeOutStart}:d=${fadeOutDur}`,
    `volume=${gainDb}dB`,
  ].join(',')

  ff([
    '-i',
    rawWav,
    '-af',
    filter,
    '-ar',
    '44100',
    '-ac',
    '1',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    '-y',
    outMp3,
  ])

  const finalDur = getDuration(outMp3)
  const kb = fs.statSync(outMp3).size / 1024

  return { dur: finalDur, kb, gain: gainDb }
}

async function main(): Promise<void> {
  fs.mkdirSync(SOURCES, { recursive: true })
  fs.mkdirSync(OUTPUT, { recursive: true })

  const sfx: SfxEntry[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'sfx.json'), 'utf8'))

  const events: Record<string, string[]> = {}
  const rootHz: Record<string, number> = {}
  const credits: Array<{
    id: string
    title: string
    author: string
    sourceUrl: string
    license: string
  }> = []

  let totalKb = 0

  for (const e of sfx) {
    process.stdout.write(`${e.id}... `)
    const { dur, kb, gain } = await processEntry(e)
    const gainStr = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)}dB`
    console.log(`${dur.toFixed(2)}s  ${kb.toFixed(1)}KB  (gain ${gainStr})`)
    totalKb += kb

    if (!events[e.event]) events[e.event] = []
    events[e.event].push(`${e.id}.mp3`)
    if (e.rootHz != null) rootHz[e.id] = e.rootHz
    credits.push({
      id: e.id,
      title: e.title,
      author: e.author,
      sourceUrl: e.sourceUrl,
      license: e.license,
    })
  }

  const manifest = { events, rootHz, credits }
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  const count = Object.values(events).flat().length
  console.log(`\n${count} sounds  |  total ${totalKb.toFixed(1)} KB  |  manifest.json written`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
