import type { VoiceId } from '../audio/voices'
import { RULES, exampleAudio, type RuleExample } from '../data/rules'
import { words, type Word } from '../data/words'

const WORDS_BY_KANA = new Map(words.map((w) => [w.kana, w]))

/** The practice word an example is, if any (pitch examples never are: they need their melody). */
export function exampleWord(example: RuleExample): Word | undefined {
  return example.accent ? undefined : WORDS_BY_KANA.get(example.kana)
}

/** A playable recording: a practice word's, or the example's own. */
export type ExampleClip = { word: number } | { rule: string }

export function exampleClip(example: RuleExample): ExampleClip {
  const word = exampleWord(example)
  return word ? { word: word.index } : { rule: exampleAudio(example) }
}

/** Every example that needs its own recording, with what VOICEVOX should read. */
export function ruleRecordings(): { name: string; say: string; accent: boolean }[] {
  return RULES.flatMap((r) => r.examples)
    .filter((e) => !exampleWord(e))
    .map((e) => ({ name: exampleAudio(e), say: e.say ?? e.kana, accent: e.accent === true }))
}

/** Play an example in a voice. */
export function playExample(
  audio: {
    playWord(index: number, voice?: VoiceId): Promise<void>
    playRuleExample(name: string, voice?: VoiceId): Promise<void>
  },
  example: RuleExample,
  voice: VoiceId,
): Promise<void> {
  const clip = exampleClip(example)
  return 'word' in clip ? audio.playWord(clip.word, voice) : audio.playRuleExample(clip.rule, voice)
}
