/** The two generated VOICEVOX voices (see scripts/voices.json). */
export type VoiceId = 'female' | 'male'
export type VoiceSetting = VoiceId | 'random'

export const VOICES: readonly VoiceId[] = ['female', 'male']

/** The voice to use for one card: the chosen one, or a random one for 'random'. */
export function pickVoice(setting: VoiceSetting, rand = Math.random): VoiceId {
  return setting === 'random' ? VOICES[Math.floor(rand() * VOICES.length)] : setting
}

/** Path of a kana's pronunciation, relative to the site root. */
export function kanaAudioPath(voice: VoiceId, kanaId: string): string {
  return `audio/${voice}/${kanaId}.mp3`
}

/** Path of a word's pronunciation; words are numbered by their position in the word list. */
export function wordAudioPath(voice: VoiceId, index: number): string {
  return `audio/${voice}/words/${String(index).padStart(3, '0')}.mp3`
}
