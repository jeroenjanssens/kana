import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { kanaNotation, loadVoices } from '../../scripts/generate-audio'
import { VOICES, kanaAudioPath, pickVoice, wordAudioPath } from '../../src/lib/audio/voices'
import { kanaById } from '../../src/lib/data/kana'
import { words } from '../../src/lib/data/words'
import { sanitizeSettings } from '../../src/lib/storage/persistence'

describe('voices', () => {
  test('pickVoice returns the setting, or a random voice', () => {
    expect(pickVoice('female')).toBe('female')
    expect(pickVoice('male')).toBe('male')
    expect(pickVoice('random', () => 0)).toBe('female')
    expect(pickVoice('random', () => 0.99)).toBe('male')
  })

  test('audio paths', () => {
    expect(kanaAudioPath('male', 'kya')).toBe('audio/male/kya.mp3')
    expect(wordAudioPath('female', 3)).toBe('audio/female/words/003.mp3')
  })

  test('old saves get the female voice', () => {
    expect(sanitizeSettings({}).voice).toBe('female')
    expect(sanitizeSettings({ voice: 'random' }).voice).toBe('random')
  })

  test('every word has audio in both voices, and there are no stray files', () => {
    for (const voice of VOICES) {
      for (const w of words)
        expect(existsSync(`public/${wordAudioPath(voice, w.index)}`), w.kana).toBe(true)
      expect(existsSync(`public/${wordAudioPath(voice, words.length)}`)).toBe(false)
    }
  })

  test('word indexes match their position', () => {
    words.forEach((w, i) => expect(w.index).toBe(i))
  })
})

describe('VOICEVOX generation', () => {
  test('single kana use phonetic notation with the accent on the first mora', () => {
    expect(kanaNotation(kanaById('ha'))).toBe("ハ'")
    expect(kanaNotation(kanaById('wo'))).toBe("ヲ'")
    expect(kanaNotation(kanaById('kya'))).toBe("キャ'")
  })

  test('the voice config is valid and has credits', () => {
    const voices = loadVoices()
    expect(voices.map((v) => v.id).sort()).toEqual(['female', 'male'])
    for (const v of voices) expect(v.credit).toBe(`VOICEVOX:${v.character}`)
  })

  test('the credits shipped with the audio match the config', () => {
    const sources = JSON.parse(readFileSync('public/audio/SOURCES.json', 'utf8'))
    expect(sources.voices).toEqual(Object.fromEntries(loadVoices().map((v) => [v.id, v])))
  })
})
