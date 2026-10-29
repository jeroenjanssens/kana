import type { KanaGroup } from '../data/kana'
import type { VoiceSetting } from '../audio/voices'
import type { PhotoMode } from '../ui/photos'
import {
  RACE_KANA,
  SCRIPT_CHOICES,
  SHEET_SIZES,
  SHEET_STROKES,
  type RaceKana,
  type ScriptChoice,
  type SheetSize,
} from '../study/scripts'
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
/** When to draw the memory-hint drawing over a kana: never, once the answer shows, or always. */
export type DrawingMode = 'off' | 'back' | 'always'
export const DRAWING_MODES: readonly DrawingMode[] = ['off', 'back', 'always']

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
  | 'srs'
  | 'order'
  | 'confusable'
  | 'listen'
  | 'reading'
  | 'intro'
  | 'write'
  | 'sprint'
  | 'race'
  | 'trace'

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
  /** Interface language: follow the browser, or English / Dutch. */
  language: 'system' | 'en' | 'nl'
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
  /** Tofugu's memory-hint drawings over the kana (intro, card back, details; front if 'always'). */
  drawings: DrawingMode
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
  /** Only rotate through photos that match the current season. */
  matchSeason: boolean
  calm: boolean
  dataSaver: boolean
  sfx: boolean
  sfxVolume: number
  voiceVolume: number
  /** Pronunciation voice: female, male, or a random one for each card. */
  voice: VoiceSetting
  uiTicks: boolean
  /** A light vibration on answers (where supported). */
  haptics: boolean
  silent: boolean
  reducedMotion: 'system' | 'on' | 'off'
  /** The script(s) and length (in minutes: 1, 2, 3 or 5) of the last sprint. */
  sprintScript: ScriptChoice
  sprintMinutes: number
  /** The last race setup: script(s), which kana, the rows for 'rows', and random order. */
  raceScript: ScriptChoice
  raceKana: RaceKana
  raceRows: string[]
  raceShuffle: boolean
  /** The last worksheet setup: script(s), rows, random order, romaji, grid, stroke colours, font and square size. */
  sheetScript: ScriptChoice
  sheetRows: string[]
  sheetShuffle: boolean
  sheetRomaji: boolean
  sheetGrid: boolean
  sheetColours: boolean
  /** The font of the model and the traces: a font id, or 'strokes' for the stroke-order data. */
  sheetFont: string
  sheetSize: SheetSize
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
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
  drawings: 'back',
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
  matchSeason: true,
  calm: false,
  dataSaver: true,
  sfx: true,
  sfxVolume: 0.5,
  voiceVolume: 1,
  voice: 'female',
  uiTicks: false,
  haptics: true,
  silent: false,
  reducedMotion: 'system',
  sprintScript: 'hiragana',
  sprintMinutes: 1,
  raceScript: 'hiragana',
  raceKana: 'seen',
  raceRows: ['basic:a', 'basic:k'],
  raceShuffle: true,
  sheetScript: 'hiragana',
  sheetRows: ['basic:a', 'basic:k'],
  sheetShuffle: false,
  sheetRomaji: true,
  sheetGrid: true,
  sheetColours: true,
  sheetFont: 'klee-one',
  sheetSize: 'medium',
}

/** Settings that only take one of a few values; anything else falls back to the default. */
export const SETTING_CHOICES: Partial<Record<keyof Settings, readonly string[]>> = {
  drawings: DRAWING_MODES,
  sprintScript: SCRIPT_CHOICES,
  raceScript: SCRIPT_CHOICES,
  raceKana: RACE_KANA,
  sheetScript: SCRIPT_CHOICES,
  sheetSize: SHEET_SIZES,
  sheetFont: [SHEET_STROKES, ...FONTS.map((f) => f.id)],
}

/** A finished sprint. Sprints saved before lengths could be chosen have no `minutes`: they're 1. */
export interface SprintResult {
  score: number
  at: number
  minutes?: number
}

/** The fastest race through a set of kana: time including penalties. */
export interface RaceResult {
  ms: number
  mistakes: number
  at: number
}

export interface WordProgress {
  seen: number
  /** Answers that weren't Again. */
  correct: number
  last: number
  /** The word's FSRS card (words practised before reading had grades get one on first load). */
  card?: CardRecord
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
  /** When the settings last changed (for merging synced copies). */
  settingsUpdatedAt: number
  /** Day the daily goal was last celebrated. */
  goalDay: string
  /** Sprint results per script choice (most recent last). */
  sprints: Partial<Record<ScriptChoice, SprintResult[]>>
  /** The fastest race per set of kana (see `raceKey`). */
  races: Record<string, RaceResult>
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
    races: {},
    goalDay: '',
    settingsUpdatedAt: 0,
    celebrated: {},
    createdAt: now,
  }
}
