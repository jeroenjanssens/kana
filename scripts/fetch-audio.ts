/**
 * Downloads the public-domain kana recordings by Hakatanoshio117117 from Wikimedia Commons,
 * trims the silence, normalises the loudness and encodes them to MP3 in public/audio/.
 *
 * Usage: npx tsx scripts/fetch-audio.ts
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { KANA } from '../src/lib/data/kana.ts'

const SOURCE_DIR = 'scripts/audio-sources'
const OUT_DIR = 'public/audio'
const USER_AGENT = 'kana-app/0.1 (https://github.com/jeroenjanssens/kana)'

/** Commons file names for kana whose name does not follow `Japanese {id}.ogg`. */
const SPECIAL: Record<string, string> = {
  a: 'Ja-A.oga',
  i: 'Japanese I.ogg',
  u: 'Japanese U.ogg',
  e: 'Ja-E.oga',
  o: 'Japanese O.ogg',
  n: 'Japanese N.ogg',
  chi: 'Japanese ti.ogg',
  fu: 'Japanese hu.ogg',
  ji: 'Japanese zi.ogg',
}

function commonsName(id: string): string {
  return SPECIAL[id] ?? `Japanese ${id}.ogg`
}

interface FileInfo {
  url: string
  descriptionurl: string
  user: string
  license: string
}

async function fileInfo(name: string): Promise<FileInfo> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|user|extmetadata',
    titles: `File:${name}`,
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  const data = await res.json()
  const page = Object.values(data.query.pages)[0] as {
    missing?: string
    imageinfo?: {
      url: string
      descriptionurl: string
      user: string
      extmetadata: Record<string, { value: string }>
    }[]
  }
  if (page.missing !== undefined || !page.imageinfo) throw new Error(`Missing on Commons: ${name}`)
  const info = page.imageinfo[0]
  return {
    url: info.url,
    descriptionurl: info.descriptionurl,
    user: info.user,
    license: info.extmetadata.LicenseShortName?.value ?? 'unknown',
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Downloads politely: Wikimedia rate-limits bursts, so wait and retry on HTTP 429. */
async function download(url: string, path: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.ok) {
      writeFileSync(path, Buffer.from(await res.arrayBuffer()))
      await sleep(1000)
      return
    }
    if (res.status !== 429) throw new Error(`Download failed (${res.status}): ${url}`)
    await sleep(5000 * 2 ** attempt)
  }
  throw new Error(`Download kept being rate-limited: ${url}`)
}

/**
 * Each recording says the syllable three times. Find the first utterance by looking for the
 * first non-silent stretch between silences.
 */
export function firstUtterance(
  log: string,
  duration: number,
): { start: number; end: number } | undefined {
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]))
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]))
  // Build the list of sounding segments [silence_end, next silence_start].
  const segments: { start: number; end: number }[] = []
  let cursor = starts[0] === 0 ? undefined : 0
  const events = [
    ...starts.map((t) => ({ t, kind: 'start' as const })),
    ...ends.map((t) => ({ t, kind: 'end' as const })),
  ].sort((a, b) => a.t - b.t)
  for (const event of events) {
    if (event.kind === 'start' && cursor !== undefined) {
      segments.push({ start: cursor, end: event.t })
      cursor = undefined
    } else if (event.kind === 'end') {
      cursor = event.t
    }
  }
  if (cursor !== undefined) segments.push({ start: cursor, end: duration })
  return segments.find((s) => s.end - s.start > 0.05)
}

function probeDuration(input: string): number {
  const out = execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    input,
  ])
  return Number(out.toString().trim())
}

function encode(input: string, output: string) {
  const stderr = spawnSync('ffmpeg', [
    '-hide_banner',
    '-i',
    input,
    '-af',
    'silencedetect=n=-48dB:d=0.15',
    '-f',
    'null',
    '-',
  ]).stderr.toString()
  const duration = probeDuration(input)
  const segment = firstUtterance(stderr, duration)
  if (!segment) throw new Error(`No utterance found in ${input}`)
  const from = Math.max(0, segment.start - 0.03)
  const to = Math.min(duration, segment.end + 0.12)
  const filter = [
    `atrim=start=${from}:end=${to}`,
    'asetpts=PTS-STARTPTS',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    'afade=t=in:d=0.01',
    `afade=t=out:st=${Math.max(0, to - from - 0.06)}:d=0.06`,
  ].join(',')
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    input,
    '-af',
    filter,
    '-ac',
    '1',
    '-ar',
    '44100',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '64k',
    output,
  ])
}

async function main() {
  mkdirSync(SOURCE_DIR, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })
  const sources: Record<string, { file: string; url: string; author: string; license: string }> = {}

  for (const kana of KANA.filter((k) => k.audio)) {
    const name = commonsName(kana.id)
    const info = await fileInfo(name)
    const ext = name.split('.').pop()
    const source = join(SOURCE_DIR, `${kana.id}.${ext}`)
    if (!existsSync(source)) await download(info.url, source)
    encode(source, join(OUT_DIR, `${kana.id}.mp3`))
    sources[kana.id] = {
      file: name,
      url: info.descriptionurl,
      author: info.user,
      license: info.license,
    }
    console.log(`${kana.id.padEnd(4)} ← ${name} (${info.user}, ${info.license})`)
  }

  writeFileSync(join(OUT_DIR, 'SOURCES.json'), JSON.stringify(sources, null, 2) + '\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
