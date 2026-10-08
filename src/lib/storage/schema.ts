import type { KanaGroup } from '../data/kana'
import { DEFAULT_FONT_ID, FONTS } from '../data/fonts'

export const SCHEMA_VERSION = 1

export type DeckId = 'hiragana' | 'katakana' | 'combined' | 'listen-hiragana' | 'listen-katakana'
export const DECK_IDS: readonly DeckId[] = [
  'hiragana',
  'katakana',
  'combined',
  'listen-hiragana',
  'listen-katakana',
]
export type StudyDeckId = 'hiragana' | 'katakana' | 'combined'
export const STUDY_DECKS: readonly StudyDeckId[] = ['hiragana', 'katakana', 'combined']

export type Grade = 1 | 2 | 3 | 4
export type AnswerStyle = 'self' | 'typed'
export type Theme = 'system' | 'light' | 'dark'
export type RomajiSystem = 'hepburn' | 'kunrei'
export type TableLayout = 'separate' | 'combined'

/** An FSRS card in a JSON-friendly shape (dates as epoch milliseconds). */
export interface CardRecord {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  /** 0 New, 1 Learning, 2 Review, 3 Relearning */
  state: 0 | 1 | 2 | 3
  last_review?: number
}

export type Mode = 'srs' | 'order' | 'confusable' | 'listen' | 'reading'

export interface ReviewEntry {
  /** Epoch ms. */
  t: number
  mode: Mode
  deck?: DeckId
  /** Kana id, or word kana for reading practice. */
  id: string
  correct: boolean
  grade?: Grade
  /** Response time in ms. */
  ms: number
  /** What was typed or picked, used for the confusion matrix (a kana id or text). */
  answer?: string
}

export interface Settings {
  newPerDay: number
  reviewsPerDay: number
  groups: KanaGroup[]
  fontMode: 'fixed' | 'random'
  font: string
  randomFonts: string[]
  answerStyle: AnswerStyle
  autoplay: boolean
  showOtherScript: boolean
  romaji: RomajiSystem
  theme: Theme
  tableLayout: TableLayout
  tableRomaji: boolean
  tableMastery: boolean
  /** Which deck colours the combined table. */
  tableMasteryDeck: StudyDeckId
  photos: boolean
  /** Rotate the background every N cards. */
  photoEvery: number
  calm: boolean
  dataSaver: boolean
  sfx: boolean
  sfxVolume: number
  voiceVolume: number
  uiTicks: boolean
  silent: boolean
  reducedMotion: 'system' | 'on' | 'off'
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  reviewsPerDay: 200,
  groups: ['basic', 'dakuten', 'yoon'],
  fontMode: 'fixed',
  font: DEFAULT_FONT_ID,
  randomFonts: FONTS.map((f) => f.id),
  answerStyle: 'self',
  autoplay: true,
  showOtherScript: true,
  romaji: 'hepburn',
  theme: 'system',
  tableLayout: 'separate',
  tableRomaji: true,
  tableMastery: true,
  tableMasteryDeck: 'combined',
  photos: true,
  photoEvery: 10,
  calm: false,
  dataSaver: true,
  sfx: true,
  sfxVolume: 0.5,
  voiceVolume: 1,
  uiTicks: false,
  silent: false,
  reducedMotion: 'system',
}

export interface WordProgress {
  seen: number
  correct: number
  last: number
}

export interface SaveFile {
  version: typeof SCHEMA_VERSION
  settings: Settings
  cards: Partial<Record<DeckId, Record<string, CardRecord>>>
  words: Record<string, WordProgress>
  log: ReviewEntry[]
  /** New cards introduced per deck per day key (YYYY-MM-DD). */
  daily: { day: string; newShown: Partial<Record<DeckId, number>> }
  /** Notes on special spellings (っ, ー, …) that have been shown in reading practice. */
  seenNotes: string[]
  /** Kana ids whose "mature" seal has been celebrated, per deck. */
  celebrated: Partial<Record<DeckId, string[]>>
  createdAt: number
}

export function emptySave(now = Date.now()): SaveFile {
  return {
    version: SCHEMA_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    cards: {},
    words: {},
    log: [],
    daily: { day: '', newShown: {} },
    seenNotes: [],
    celebrated: {},
    createdAt: now,
  }
}
