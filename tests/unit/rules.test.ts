import { existsSync, readdirSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { kanaById } from '../../src/lib/data/kana'
import { rulesNl } from '../../src/lib/data/nl/rules'
import { RULES, exampleAudio, localRule, rulesForKana } from '../../src/lib/data/rules'
import { devoices, rulesFor, words } from '../../src/lib/data/words'
import { exampleClip, ruleRecordings, wordsWithRule } from '../../src/lib/study/examples'

describe('rules', () => {
  test('each rule once, from level 1 to 3, each with examples', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length)
    const levels = RULES.map((r) => r.level)
    expect(levels).toEqual([...levels].sort())
    for (const r of RULES) expect(r.examples.length, r.id).toBeGreaterThanOrEqual(2)
  })

  test('every rule is translated, with a note for each example', () => {
    for (const r of RULES) {
      const nl = rulesNl[r.id]
      expect(nl.body, r.id).toHaveLength(r.body.length)
      expect(nl.notes, r.id).toHaveLength(r.examples.length)
      expect(localRule(r, 'nl').examples.map((e) => e.note)).toEqual(nl.notes)
    }
  })

  test('every example can be heard in both voices, and no recording is left over', () => {
    const names = ruleRecordings().map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
    for (const voice of ['female', 'male']) {
      for (const e of RULES.flatMap((r) => r.examples)) {
        const clip = exampleClip(e)
        const file =
          'word' in clip
            ? `public/audio/${voice}/words/${String(clip.word).padStart(3, '0')}.mp3`
            : `public/audio/${voice}/rules/${clip.rule}.mp3`
        expect(existsSync(file), `${voice}: ${e.kana} (${file})`).toBe(true)
      }
      const files = readdirSync(`public/audio/${voice}/rules`).map((f) => f.replace('.mp3', ''))
      expect(files.sort()).toEqual([...names].sort())
    }
  })

  test('recording names are plain ASCII, with long vowels doubled', () => {
    expect(exampleAudio({ kana: 'おばあさん', romaji: 'obāsan', note: '' })).toBe('obaasan')
    expect(exampleAudio({ kana: 'きんえん', romaji: 'kin’en', note: '' })).toBe('kinen')
    expect(exampleAudio({ kana: 'わたしは', romaji: 'watashi wa', note: '' })).toBe('watashi-wa')
    for (const r of ruleRecordings()) expect(r.name).toMatch(/^[a-z-]+$/)
  })

  test('pitch examples always have their own recording', () => {
    const pitch = RULES.find((r) => r.id === 'pitch')!
    for (const e of pitch.examples) expect('rule' in exampleClip(e)).toBe(true)
  })

  test('kana link to the rules about them', () => {
    expect(rulesForKana(kanaById('n'))).toEqual(['n', 'n-apostrophe'])
    expect(rulesForKana(kanaById('ha'))).toEqual(['particles'])
    expect(rulesForKana(kanaById('fu'))).toEqual(['sounds'])
    expect(rulesForKana(kanaById('ra'))).toEqual(['r'])
    expect(rulesForKana(kanaById('du'))).toEqual(['dakuten', 'ji-zu'])
    expect(rulesForKana(kanaById('gya'))).toEqual(['dakuten', 'yoon'])
    expect(rulesForKana(kanaById('x-fa'))).toEqual(['small-vowels'])
    expect(rulesForKana(kanaById('ka'))).toEqual([])
  })
})

describe('which rules a word uses', () => {
  /** Rules that can't be practised with single words. */
  const UNPRACTISED = ['particles', 'mora', 'final-sokuon', 'pitch', 'special']

  test('at least 500 words, and at least 8 for every rule that can be practised', () => {
    expect(words.length).toBeGreaterThanOrEqual(500)
    for (const r of RULES) {
      if (UNPRACTISED.includes(r.id)) continue
      expect(wordsWithRule(r.id).length, r.id).toBeGreaterThanOrEqual(8)
    }
  })

  test.each([
    ['きんえん', ['n', 'n-apostrophe']],
    ['がっこう', ['dakuten', 'long-vowel', 'sokuon']],
    ['せんせい', ['n', 'long-vowel']],
    ['おおきい', ['long-vowel', 'oo']],
    ['おもう', []],
    ['さんぽ', ['dakuten', 'n']],
    ['すし', []],
    ['です', ['dakuten', 'devoicing']],
    ['はなぢ', ['dakuten', 'rendaku', 'ji-zu']],
    ['こんにちは', ['n', 'particles']],
    ['ヴァイオリン', ['dakuten', 'r', 'n', 'small-vowels']],
    ['コーヒー', ['choon']],
    ['ひと', ['devoicing']],
  ])('%s', (kana, expected) => {
    const word = words.find((w) => w.kana === kana)
    const rules = word ? word.rules : rulesFor(kana, '', 'hiragana')
    expect(rules).toEqual(expected)
  })

  test('silent vowels: between voiceless consonants, not before h, and in です and ます', () => {
    expect(devoices('すき')).toBe(true)
    expect(devoices('くさ')).toBe(true)
    expect(devoices('ふたつ')).toBe(true)
    expect(devoices('いただきます')).toBe(true)
    expect(devoices('すし')).toBe(false)
    expect(devoices('しはい')).toBe(false)
    expect(devoices('ねこ')).toBe(false)
  })

  test('the rules are listed in the order of the rules page', () => {
    const order = RULES.map((r) => r.id)
    for (const w of words) {
      const positions = w.rules.map((r) => order.indexOf(r))
      expect(positions, w.kana).toEqual([...positions].sort((a, b) => a - b))
    }
  })
})
