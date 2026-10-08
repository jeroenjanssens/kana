import type { KanaGroup } from '../data/kana'
import type { VoiceSetting } from '../audio/voices'
import type { PhotoMode } from '../ui/photos'
import { DEFAULT_FONT_ID, FONTS } from '../data/fonts'

export const SCHEMA_VERSION = 1

export type DeckId =
  | 'hiragana'
  | 'katakana'
  | 'combined'
  | 'listen-hiragana'
  | 'listen-katakana'
  | 'write-hiragana'
  | 'write-katakana'
export const DECK_IDS: readonly DeckId[] = [
  'hiragana',
  'katakana',
  'combined',
  'listen-hiragana',
  'listen-katakana',
  'write-hiragana',
  'write-katakana',
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

export type Mode =
  'srs' | 'order' | 'confusable' | 'listen' | 'reading' | 'intro' | 'write' | 'sprint'

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
  /** True when this was the first time the card was studied. */
  new?: boolean
}

export interface Settings {
  newPerDay: number
  reviewsPerDay: number
  /** Lapses after which a card counts as a leech. */
  leechThreshold: number
  /** Show an introduction (sound, strokes, memory hint) before a new kana is first quizzed. */
  introduce: boolean
  /** Desired retention for spaced repetition (0.80–0.95). */
  retention: number
  /** Personalised FSRS weights from the optimiser (empty: defaults). */
  fsrsWeights: number[]
  /** When the weights were optimised, and on how many reviews. */
  optimizedAt: number
  optimizedReviews: number
  /** Answers per day to aim for. */
  dailyGoal: number
  /** Time of the calendar reminder, "HH:MM". */
  reminderTime: string
  groups: KanaGroup[]
  fontMode: 'fixed' | 'random'
  font: string
  randomFonts: string[]
  answerStyle: AnswerStyle
  /** How to answer in writing practice: draw the kana, or choose it from look-alikes. */
  writeStyle: 'draw' | 'choose'
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
  /** How the background photo changes: every N cards, every N minutes, daily, or never. */
  photoMode: PhotoMode
  /** Rotate the background every N cards ('cards' mode). */
  photoEvery: number
  /** Rotate the background every N minutes ('minutes' mode). */
  photoMinutes: number
  /** The photo currently shown (or kept, in 'fixed' mode). */
  photoSlug: string
  /** Day the photo of the day was last chosen ('daily' mode). */
  photoDay: string
  calm: boolean
  dataSaver: boolean
  sfx: boolean
  sfxVolume: number
  voiceVolume: number
  /** Pronunciation voice: female, male, or a random one for each card. */
  voice: VoiceSetting
  uiTicks: boolean
  silent: boolean
  reducedMotion: 'system' | 'on' | 'off'
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  reviewsPerDay: 200,
  leechThreshold: 6,
  introduce: true,
  retention: 0.9,
  fsrsWeights: [],
  optimizedAt: 0,
  optimizedReviews: 0,
  dailyGoal: 30,
  reminderTime: '19:00',
  groups: ['basic', 'dakuten', 'yoon'],
  fontMode: 'fixed',
  font: DEFAULT_FONT_ID,
  randomFonts: FONTS.map((f) => f.id),
  answerStyle: 'self',
  writeStyle: 'draw',
  autoplay: true,
  showOtherScript: true,
  romaji: 'hepburn',
  theme: 'system',
  tableLayout: 'separate',
  tableRomaji: true,
  tableMastery: true,
  tableMasteryDeck: 'combined',
  photos: true,
  photoMode: 'cards',
  photoEvery: 10,
  photoMinutes: 5,
  photoSlug: '',
  photoDay: '',
  calm: false,
  dataSaver: true,
  sfx: true,
  sfxVolume: 0.5,
  voiceVolume: 1,
  voice: 'female',
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
  /** Day the daily goal was last celebrated. */
  goalDay: string
  /** One-minute sprint results per script (most recent last). */
  sprints: Partial<Record<'hiragana' | 'katakana', { score: number; at: number }[]>>
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
    sprints: {},
    goalDay: '',
    celebrated: {},
    createdAt: now,
  }
}
