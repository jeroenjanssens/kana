import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { confusableSets } from '../../src/lib/data/confusables'
import { KANA } from '../../src/lib/data/kana'
import { KANA_NOTES } from '../../src/lib/data/mnemonics'
import { hintsNl } from '../../src/lib/data/nl/confusables'
import { mnemonicsNl } from '../../src/lib/data/nl/mnemonics'
import { kanaNotesNl, readingNotesNl } from '../../src/lib/data/nl/notes'
import { meaningsNl } from '../../src/lib/data/nl/words'
import { words } from '../../src/lib/data/words'
import { NOTES } from '../../src/lib/study/reading'

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return svelteFiles(path)
    return name.endsWith('.svelte') ? [path] : []
  })
}

/** Text that is fine to leave as it is: names, keys and symbols. */
const ALLOWED = new Set([
  'kana',
  'English',
  'Nederlands',
  'Unsplash',
  'GitHub',
  'VOICEVOX',
  'KanjiVG',
  'Google Fonts',
  'Freesound',
  'Hepburn (shi)',
  'Kunrei (si)',
  'Romaji',
  'Space',
  'Enter',
  'Esc',
])

/** Replace every {expression} (with nested braces, strings and template literals) by a space. */
function stripExpressions(markup: string): string {
  let out = ''
  let depth = 0
  let quote = ''
  for (let i = 0; i < markup.length; i++) {
    const c = markup[i]
    if (depth === 0) {
      if (c === '{') depth = 1
      else out += c
      continue
    }
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) out += ' '
  }
  return out
}

/** English words written directly in the markup (outside {t(…)}), which would not be translated. */
function untranslated(source: string): string[] {
  const markup = stripExpressions(
    source
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<kbd>[\s\S]*?<\/kbd>/g, ''),
  )
  const found: string[] = []
  // Text between tags.
  for (const m of markup.matchAll(/>([^<]+)</g)) {
    const text = m[1].trim()
    if (/[A-Za-z]{3,}/.test(text) && !ALLOWED.has(text)) found.push(text)
  }
  // Plain attribute values that people read.
  for (const m of markup.matchAll(
    /\b(aria-label|title|placeholder|alt)="([^"{]*[A-Za-z]{3,}[^"{]*)"/g,
  )) {
    if (!ALLOWED.has(m[2])) found.push(`${m[1]}="${m[2]}"`)
  }
  return found
}

describe('interface translation', () => {
  test.each(svelteFiles('src').map((f) => [f]))('%s has no untranslated English text', (file) => {
    expect(untranslated(readFileSync(file, 'utf8'))).toEqual([])
  })
})

describe('Dutch learning content', () => {
  test('every word has a Dutch meaning', () => {
    expect(words.filter((w) => !meaningsNl[w.kana]).map((w) => w.kana)).toEqual([])
    expect(Object.keys(meaningsNl).filter((k) => !words.some((w) => w.kana === k))).toEqual([])
  })

  test('every basic kana has Dutch memory hints with an emphasised sound', () => {
    for (const k of KANA.filter((k) => k.group === 'basic')) {
      const nl = mnemonicsNl[k.id]
      expect(nl, k.id).toBeDefined()
      expect(nl.hiragana).toMatch(/\*[^*]+\*/)
      expect(nl.katakana).toMatch(/\*[^*]+\*/)
    }
  })

  test('every confusable hint is translated', () => {
    for (const set of confusableSets) {
      for (const c of set.chars) expect(hintsNl[set.id]?.[c], `${set.id} ${c}`).toBeTruthy()
    }
  })

  test('every note is translated', () => {
    for (const id of Object.keys(KANA_NOTES))
      expect(kanaNotesNl[id as keyof typeof kanaNotesNl], id).toBeDefined()
    for (const id of Object.keys(NOTES))
      expect(readingNotesNl[id as keyof typeof readingNotesNl], id).toBeDefined()
  })
})
