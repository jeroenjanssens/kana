/**
 * Generates pronunciation audio with VOICEVOX (https://voicevox.hiroshiba.jp): every kana and
 * every reading-practice word, for each voice in scripts/voices.json.
 *
 * Needs a local VOICEVOX engine:
 *   docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts            # generate public/audio/{voice}/…
 *   npx tsx scripts/generate-audio.ts --voice=male  # regenerate one voice only
 *   npx tsx scripts/generate-audio.ts --preview  # build voice-preview/index.html to compare voices
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { KANA, type Kana } from '../src/lib/data/kana.ts'
import { words } from '../src/lib/data/words.ts'
import { kanaAudioPath, wordAudioPath, type VoiceId } from '../src/lib/audio/voices.ts'

const ENGINE = process.env.VOICEVOX_URL ?? 'http://localhost:50021'
const OUT_DIR = 'public/audio'
const PREVIEW_DIR = 'voice-preview'

export interface Voice {
  /** Folder name and setting value. */
  id: VoiceId
  /** VOICEVOX character name, e.g. 冥鳴ひまり. */
  character: string
  /** VOICEVOX style id ("speaker" in the API). */
  speaker: number
  /** Credit line required by the character's terms of use. */
  credit: string
  terms: string
}

/**
 * VOICEVOX "AquesTalk-style" kana notation for a single kana, so it is read exactly as written
 * (は as "ha", を as "o", ん as a syllabic n), with the accent on the first mora.
 */
export function kanaNotation(kana: Kana): string {
  return `${kana.katakana}'`
}

async function post<T>(path: string, body?: unknown, raw = false): Promise<T> {
  const res = await fetch(`${ENGINE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`VOICEVOX ${path} failed: ${res.status} ${await res.text()}`)
  return (raw ? Buffer.from(await res.arrayBuffer()) : await res.json()) as T
}

interface AccentPhrase {
  moras: { vowel_length: number; vowel: string; consonant: string | null }[]
}

interface AudioQuery {
  accent_phrases: unknown[]
  speedScale: number
  prePhonemeLength: number
  postPhonemeLength: number
  [key: string]: unknown
}

/** How single kana are spoken. */
export interface KanaStyle {
  /** Speech speed (1 = normal). */
  speed: number
  /** Vowel length multiplier for single kana. */
  stretch: number
  /**
   * Minimum length (seconds) of the weak u/i after s, sh, k, ts, ch, h, f, p, t (す, く, つ, ふ, し,
   * き…). Japanese whispers these, so on their own they can sound like a bare consonant.
   */
  minWeakVowel: number
}

/** Natural speed and length, with the weak u/i held long enough to be heard (chosen by ear). */
export const KANA_STYLE: KanaStyle = { speed: 1, stretch: 1, minWeakVowel: 0.28 }

const VOICELESS = new Set(['s', 'sh', 'k', 'ts', 'ch', 'h', 'f', 'p', 't'])

/** Synthesize `text` with a voice. `kana` text uses the phonetic notation instead of reading. */
export async function synthesize(
  text: string,
  speaker: number,
  kana: boolean,
  style: KanaStyle = KANA_STYLE,
): Promise<Buffer> {
  const q = new URLSearchParams({ text: kana ? 'あ' : text, speaker: String(speaker) })
  const query = await post<AudioQuery>(`/audio_query?${q}`)
  if (kana) {
    const p = new URLSearchParams({ text, speaker: String(speaker), is_kana: 'true' })
    const phrases = await post<AccentPhrase[]>(`/accent_phrases?${p}`)
    // Hold the vowel a little longer than in running speech, as when saying a kana on its own; the
    // weak u/i after a voiceless consonant gets extra length so it doesn't vanish into the hiss.
    for (const mora of phrases.flatMap((ph) => ph.moras)) {
      const weak = VOICELESS.has(mora.consonant ?? '') && (mora.vowel === 'u' || mora.vowel === 'i')
      mora.vowel_length *= style.stretch
      if (weak) mora.vowel_length = Math.max(mora.vowel_length, style.minWeakVowel)
    }
    query.accent_phrases = phrases
  }
  // With a little room around the sound for clean trimming.
  query.speedScale = kana ? style.speed : 0.95
  query.prePhonemeLength = 0.1
  query.postPhonemeLength = 0.15
  return post<Buffer>(`/synthesis?speaker=${speaker}`, query, true)
}

/** Trim silence at both ends, normalise loudness and encode to a small mono MP3. */
export function encodeMp3(wav: Buffer, output: string) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03'
  const filter = [trim, 'areverse', trim, 'areverse', 'loudnorm=I=-16:TP=-1.5:LRA=11'].join(',')
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
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
    ],
    { input: wav },
  )
}

export function loadVoices(path = 'scripts/voices.json'): Voice[] {
  const voices = JSON.parse(readFileSync(path, 'utf8')) as Voice[]
  for (const v of voices) {
    if (
      !['female', 'male'].includes(v.id) ||
      !Number.isInteger(v.speaker) ||
      !v.credit.startsWith('VOICEVOX:')
    ) {
      throw new Error(`Invalid voice in ${path}: ${JSON.stringify(v)}`)
    }
  }
  return voices
}

/** Generate all voices, or only the one given with --voice=<id>. */
async function generate(only?: string) {
  const voices = loadVoices()
  for (const voice of voices.filter((v) => !only || v.id === only)) {
    const dir = join(OUT_DIR, voice.id)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(join(dir, 'words'), { recursive: true })
    for (const kana of KANA) {
      const file = join('public', kanaAudioPath(voice.id, kana.id))
      encodeMp3(await synthesize(kanaNotation(kana), voice.speaker, true), file)
    }
    for (const [i, word] of words.entries()) {
      encodeMp3(
        await synthesize(word.kana, voice.speaker, false),
        join('public', wordAudioPath(voice.id, i)),
      )
    }
    console.log(`${voice.id}: ${KANA.length} kana and ${words.length} words (${voice.character})`)
  }
  const sources = { engine: 'VOICEVOX', voices: Object.fromEntries(voices.map((v) => [v.id, v])) }
  writeFileSync(join(OUT_DIR, 'SOURCES.json'), JSON.stringify(sources, null, 2) + '\n')
}

/** A small HTML page with rows of play buttons. */
function previewPage(title: string, intro: string, rows: string[]): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; background: #f4efe6; color: #1c1b19 }
  table { border-collapse: collapse } th { text-align: left; padding: .6rem 1rem .6rem 0; white-space: nowrap; vertical-align: top }
  th small { display: block; font-weight: 400; color: #857e72 } td { padding: .4rem 0 }
  tr { border-bottom: 1px solid #ddd2bf }
  button { font: 20px/1 "Hiragino Sans", sans-serif; margin: 2px; padding: .4rem .55rem; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer }
  button.word { font-size: 15px; background: #fbf8f2 } button.playing { background: #c73e1d; color: #fff }
</style>
<h1>${title}</h1>
<p>${intro}</p>
<table>${rows.join('\n')}</table>
<script>
  const audio = new Audio()
  const play = (b) => new Promise((done) => {
    document.querySelectorAll('.playing').forEach((x) => x.classList.remove('playing'))
    b.classList.add('playing'); audio.src = b.dataset.src; audio.onended = done; audio.play()
  })
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (b) return play(b)
    const th = e.target.closest('th'); if (!th) return
    for (const btn of th.parentElement.querySelectorAll('button')) { await play(btn); await new Promise((r) => setTimeout(r, 250)) }
  })
</script>`
}

/** Candidate voices for the preview page: neutral-sounding adult voices of both genders. */
const CANDIDATES: {
  gender: 'female' | 'male'
  character: string
  style: string
  speaker: number
}[] = [
  { gender: 'female', character: '冥鳴ひまり', style: 'ノーマル', speaker: 14 },
  { gender: 'female', character: 'No.7', style: 'アナウンス', speaker: 30 },
  { gender: 'female', character: 'No.7', style: 'ノーマル', speaker: 29 },
  { gender: 'female', character: '春日部つむぎ', style: 'ノーマル', speaker: 8 },
  { gender: 'female', character: '九州そら', style: 'ノーマル', speaker: 16 },
  { gender: 'female', character: '四国めたん', style: 'ノーマル', speaker: 2 },
  { gender: 'female', character: '東北イタコ', style: 'ノーマル', speaker: 109 },
  { gender: 'male', character: '青山龍星', style: 'ノーマル', speaker: 13 },
  { gender: 'male', character: '玄野武宏', style: 'ノーマル', speaker: 11 },
  { gender: 'male', character: '剣崎雌雄', style: 'ノーマル', speaker: 21 },
  { gender: 'male', character: '雀松朱司', style: 'ノーマル', speaker: 52 },
  { gender: 'male', character: '麒ヶ島宗麟', style: 'ノーマル', speaker: 53 },
  { gender: 'male', character: '離途', style: 'ノーマル', speaker: 99 },
  { gender: 'male', character: '白上虎太郎', style: 'ふつう', speaker: 12 },
]

const PREVIEW_KANA = ['a', 'ka', 'shi', 'tsu', 'ha', 'fu', 'ra', 'wo', 'n', 'ga', 'kya', 'ryo']
const PREVIEW_WORDS = ['ねこ', 'がっこう', 'ありがとう', 'しゃしん', 'コーヒー', 'アムステルダム']

async function preview() {
  rmSync(PREVIEW_DIR, { recursive: true, force: true })
  mkdirSync(PREVIEW_DIR, { recursive: true })
  const kana = PREVIEW_KANA.map((id) => KANA.find((k) => k.id === id)!)
  const rows: string[] = []
  for (const c of CANDIDATES) {
    const cells: string[] = []
    for (const k of kana) {
      const file = `${c.speaker}-${k.id}.mp3`
      encodeMp3(await synthesize(kanaNotation(k), c.speaker, true), join(PREVIEW_DIR, file))
      cells.push(`<button data-src="${file}">${k.hiragana}</button>`)
    }
    for (const [i, w] of PREVIEW_WORDS.entries()) {
      const file = `${c.speaker}-w${i}.mp3`
      encodeMp3(await synthesize(w, c.speaker, false), join(PREVIEW_DIR, file))
      cells.push(`<button class="word" data-src="${file}">${w}</button>`)
    }
    rows.push(
      `<tr><th>${c.gender === 'female' ? '♀' : '♂'} ${c.character}<small>${c.style} · id ${c.speaker}</small></th><td>${cells.join('')}</td></tr>`,
    )
    console.log(`preview: ${c.character} (${c.style})`)
  }
  writeFileSync(
    join(PREVIEW_DIR, 'index.html'),
    previewPage(
      'kana — voice preview',
      'Click a kana or word to hear it. Click the voice name to play the row.',
      rows,
    ),
  )
  console.log(`Open ${PREVIEW_DIR}/index.html`)
}

/** Candidate styles for single kana, to compare by ear. */
const STYLES: { name: string; style: KanaStyle }[] = [
  {
    name: 'A · previous (slow, every vowel ×1.7)',
    style: { speed: 0.9, stretch: 1.7, minWeakVowel: 0 },
  },
  {
    name: 'B · natural (normal speed, no stretch)',
    style: { speed: 1, stretch: 1, minWeakVowel: 0 },
  },
  { name: 'C · natural, clear weak u/i (current)', style: KANA_STYLE },
  {
    name: 'D · slightly held (×1.2), clear weak u/i',
    style: { speed: 1, stretch: 1.2, minWeakVowel: 0.3 },
  },
  {
    name: 'E · held (×1.4), clear weak u/i',
    style: { speed: 1, stretch: 1.4, minWeakVowel: 0.32 },
  },
]
const STYLE_KANA = [
  'a',
  'ka',
  'su',
  'shi',
  'tsu',
  'ku',
  'fu',
  'hi',
  'ki',
  'n',
  'wo',
  'kya',
  'ra',
  'ma',
]

/** Build voice-preview/styles.html: the same kana in each style, for both voices. */
async function previewStyles() {
  mkdirSync(PREVIEW_DIR, { recursive: true })
  const voices = loadVoices()
  const kana = STYLE_KANA.map((id) => KANA.find((k) => k.id === id)!)
  const rows: string[] = []
  for (const [si, { name, style }] of STYLES.entries()) {
    for (const v of voices) {
      const cells: string[] = []
      for (const k of kana) {
        const file = `style${si}-${v.id}-${k.id}.mp3`
        encodeMp3(
          await synthesize(kanaNotation(k), v.speaker, true, style),
          join(PREVIEW_DIR, file),
        )
        cells.push(`<button data-src="${file}">${k.hiragana}</button>`)
      }
      rows.push(
        `<tr><th>${name}<small>${v.character} (${v.id})</small></th><td>${cells.join('')}</td></tr>`,
      )
    }
    console.log(`styles: ${name}`)
  }
  writeFileSync(
    join(PREVIEW_DIR, 'styles.html'),
    previewPage(
      'kana — pronunciation styles',
      'Compare how single kana are spoken. Click a row title to play the whole row.',
      rows,
    ),
  )
  console.log(`Open ${PREVIEW_DIR}/styles.html`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const only = process.argv.find((a) => a.startsWith('--voice='))?.slice('--voice='.length)
  const run = process.argv.includes('--preview-styles')
    ? previewStyles()
    : process.argv.includes('--preview')
      ? preview()
      : generate(only)
  run.catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
