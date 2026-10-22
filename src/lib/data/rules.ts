import type { Lang } from '../i18n/format'
import type { Kana } from './kana'
import { rulesNl } from './nl/rules'

/**
 * Pronunciation and spelling rules for reading kana, from the first ones you need to the rare
 * ones. Checked against Wikipedia's articles on Japanese phonology, rendaku, sokuon and pitch
 * accent (see RULE_SOURCES).
 */

export type RuleId =
  | 'dakuten'
  | 'r'
  | 'n'
  | 'yoon'
  | 'choon'
  | 'long-vowel'
  | 'sokuon'
  | 'particles'
  | 'mora'
  | 'devoicing'
  | 'sounds'
  | 'small-vowels'
  | 'ji-zu'
  | 'rendaku'
  | 'n-apostrophe'
  | 'oo'
  | 'final-sokuon'
  | 'pitch'
  | 'nasal-g'
  | 'special'

/** 1: needed from the start; 2: common, good to know soon; 3: rare or advanced. */
export type RuleLevel = 1 | 2 | 3

export interface RuleExample {
  /** As written. */
  kana: string
  /** Hepburn romaji, as the app writes it. */
  romaji: string
  /** The meaning, or what the example shows. */
  note: string
  /**
   * The recording's name, for examples that aren't practice words (practice words use their own
   * recording). Defaults to the romaji.
   */
  audio?: string
  /**
   * What VOICEVOX reads, when the kana alone could be read differently (readings in kanji are in
   * scripts/generate-audio.ts, so they don't end up in the fonts).
   */
  say?: string
  /** `say` is in VOICEVOX's kana notation, with ' after the accented beat. */
  accent?: boolean
}

export interface Rule {
  id: RuleId
  level: RuleLevel
  title: string
  /** Paragraphs. */
  body: string[]
  examples: RuleExample[]
}

export const RULES: readonly Rule[] = [
  // ── Level 1 ─────────────────────────────────────────────────────────────────
  {
    id: 'dakuten',
    level: 1,
    title: 'Dakuten ゛ and handakuten ゜',
    body: [
      'Two small strokes at the top right (dakuten) make a sound voiced: k becomes g, s becomes z, t becomes d and h becomes b. A small circle (handakuten) turns the h-row into p.',
      'じ and ぢ are both said ji, and ず and づ are both zu (see “ぢ and づ”).',
    ],
    examples: [
      { kana: 'かぎ', romaji: 'kagi', note: 'key: き ki → ぎ gi' },
      { kana: 'かぞく', romaji: 'kazoku', note: 'family: そ so → ぞ zo' },
      { kana: 'まど', romaji: 'mado', note: 'window: と to → ど do' },
      { kana: 'ぶた', romaji: 'buta', note: 'pig: ふ fu → ぶ bu' },
      { kana: 'えんぴつ', romaji: 'enpitsu', note: 'pencil: ひ hi → ぴ pi' },
    ],
  },
  {
    id: 'r',
    level: 1,
    title: 'The r-sound',
    body: [
      'The Japanese r is one quick tap of the tip of the tongue just behind the upper teeth, like the tt in American “butter”. It sits somewhere between r, l and d, and it’s never rolled or growled.',
    ],
    examples: [
      { kana: 'そら', romaji: 'sora', note: 'sky' },
      { kana: 'さくら', romaji: 'sakura', note: 'cherry blossom' },
      { kana: 'とり', romaji: 'tori', note: 'bird' },
      { kana: 'くろ', romaji: 'kuro', note: 'black' },
      { kana: 'よる', romaji: 'yoru', note: 'night' },
    ],
  },
  {
    id: 'n',
    level: 1,
    title: 'ん is a beat of its own',
    body: [
      'ん is the only kana without a vowel, but it still takes a full beat. Its sound follows the sound after it:',
      'before m, b and p it’s an m (さんぽ sounds like “sampo”); before k and g it’s the ng in “sing”; before t, d, n and r it’s an n; before a vowel, y, w, s or h the tongue doesn’t touch anything and it’s a nasal vowel; at the end of a word it’s a soft n, made further back in the mouth.',
      'The romaji in this app always writes n.',
    ],
    examples: [
      { kana: 'さんぽ', romaji: 'sanpo', note: 'a walk: sounds like “sampo”' },
      { kana: 'しんぶん', romaji: 'shinbun', note: 'newspaper: sounds like “shimbun”' },
      { kana: 'りんご', romaji: 'ringo', note: 'apple: ng as in “sing”' },
      { kana: 'げんき', romaji: 'genki', note: 'healthy, well: ng' },
      { kana: 'ほん', romaji: 'hon', note: 'book: a soft n at the end' },
    ],
  },
  {
    id: 'yoon',
    level: 1,
    title: 'Small ゃ ゅ ょ blend into one sound',
    body: [
      'A small ゃ, ゅ or ょ after an i-row kana (き, し, ち, に, ひ, み, り and their dakuten forms) merges with it into one syllable, and one beat.',
      'The size matters: with a full-size や, ゆ or よ it’s two beats, and a different word.',
    ],
    examples: [
      { kana: 'おちゃ', romaji: 'ocha', note: 'tea: ち + ゃ → ちゃ cha' },
      { kana: 'しゃしん', romaji: 'shashin', note: 'photo: し + ゃ → しゃ sha' },
      { kana: 'ひゃく', romaji: 'hyaku', note: 'hundred: ひ + ゃ → ひゃ hya' },
      { kana: 'びょういん', romaji: 'byōin', note: 'hospital: three syllables, びょ-う-い-ん' },
      { kana: 'びよういん', romaji: 'biyōin', note: 'beauty salon: with a big よ, び-よ-う-い-ん' },
    ],
  },
  {
    id: 'choon',
    level: 1,
    title: 'ー makes a vowel long',
    body: [
      'In katakana, the dash ー stretches the vowel before it to twice its length: two beats. Romaji writes a line over the vowel (ō) or doubles it (ii).',
      'Length changes the meaning: ビル is a building, ビール is beer.',
    ],
    examples: [
      { kana: 'コーヒー', romaji: 'kōhī', note: 'coffee' },
      { kana: 'ケーキ', romaji: 'kēki', note: 'cake' },
      { kana: 'ラーメン', romaji: 'rāmen', note: 'ramen' },
      { kana: 'ビル', romaji: 'biru', note: 'building: short i' },
      { kana: 'ビール', romaji: 'bīru', note: 'beer: long ī' },
    ],
  },
  {
    id: 'long-vowel',
    level: 1,
    title: 'Long vowels in hiragana',
    body: [
      'Hiragana has no long-vowel mark: a vowel is made long by writing a second one. ああ is ā, いい is ī and うう is ū.',
      'For a long e you usually write い: えい is said ē (せんせい sounds like “sensē”). For a long o you usually write う: おう is said ō. A few words use ええ or おお instead (see “おお instead of おう”).',
      'A long vowel takes two beats, and length changes the meaning: おばさん is aunt, おばあさん grandmother. When the two vowels belong to different parts of a word, each keeps its sound, as in おもう o-mo-u (to think).',
    ],
    examples: [
      { kana: 'おかあさん', romaji: 'okāsan', note: 'mother: ああ → ā' },
      { kana: 'いいえ', romaji: 'iie', note: 'no: いい → ī' },
      { kana: 'せんせい', romaji: 'sensē', note: 'teacher: えい → ē' },
      { kana: 'がっこう', romaji: 'gakkō', note: 'school: おう → ō' },
      { kana: 'おばさん', romaji: 'obasan', note: 'aunt: short a' },
      { kana: 'おばあさん', romaji: 'obāsan', note: 'grandmother: long ā' },
    ],
  },
  {
    id: 'sokuon',
    level: 1,
    title: 'Small っ doubles the next consonant',
    body: [
      'A small っ (ッ in katakana) isn’t said “tsu”. It’s a short pause, one beat long, that doubles the consonant after it, as in the middle of “bookcase”.',
      'Romaji doubles the consonant: っか is kka, っし is sshi, and っち is tchi (まっちゃ matcha).',
    ],
    examples: [
      { kana: 'がっこう', romaji: 'gakkō', note: 'school' },
      { kana: 'きっぷ', romaji: 'kippu', note: 'ticket' },
      { kana: 'ざっし', romaji: 'zasshi', note: 'magazine' },
      { kana: 'きて', romaji: 'kite', note: 'come!: no pause' },
      { kana: 'きって', romaji: 'kitte', note: 'stamp: a pause before the t' },
    ],
  },
  {
    id: 'particles',
    level: 1,
    title: 'は, へ and を as particles',
    body: [
      'Three kana are said differently when they’re particles, the small words that show the role of a word in a sentence: は is said wa, へ is said e, and を is said o.',
      'Everywhere else は and へ keep their own sound (はな hana, へや heya). を is only ever used as a particle.',
    ],
    examples: [
      { kana: 'わたしは', romaji: 'watashi wa', note: 'I (as the topic)' },
      { kana: 'こんにちは', romaji: 'konnichiwa', note: 'hello: ends in a particle は' },
      { kana: 'がっこうへ', romaji: 'gakkō e', note: 'to school' },
      { kana: 'みずを', romaji: 'mizu o', note: 'water (as the object)' },
    ],
  },
  {
    id: 'mora',
    level: 1,
    title: 'Every kana is one beat',
    body: [
      'Japanese has an even rhythm: every kana takes about the same time, a beat (a mora). Long vowels, a small っ and ん each count as a beat too; small ゃ ゅ ょ and small vowels don’t, they join the kana before them.',
      'So にっぽん is four beats, に-っ-ぽ-ん, and とうきょう is four, と-う-きょ-う, not two syllables as in English.',
    ],
    examples: [
      { kana: 'にっぽん', romaji: 'nippon', note: 'Japan: に-っ-ぽ-ん, four beats' },
      { kana: 'とうきょう', romaji: 'tōkyō', note: 'Tokyo: と-う-きょ-う, four beats' },
      { kana: 'ぎんこう', romaji: 'ginkō', note: 'bank: ぎ-ん-こ-う, four beats' },
    ],
  },

  // ── Level 2 ─────────────────────────────────────────────────────────────────
  {
    id: 'devoicing',
    level: 2,
    title: 'Vowels that go silent',
    body: [
      'In standard Japanese, i and u are often whispered or dropped when they come between two voiceless consonants (k, s, t, p, and sh, ch, ts, f, h), or at the end of a word after one. です sounds like “des”, すき like “ski” and ひと like “h’to”.',
      'It doesn’t happen before an h, and usually not in two beats in a row. It’s part of natural speech, but you’re understood just as well if you say the vowel, and the romaji always writes it.',
    ],
    examples: [
      { kana: 'すき', romaji: 'suki', note: 'to like: sounds like “ski”' },
      { kana: 'ひと', romaji: 'hito', note: 'person: the i is whispered' },
      { kana: 'くつ', romaji: 'kutsu', note: 'shoes: the first u is whispered' },
      { kana: 'です', romaji: 'desu', note: 'is, am, are: sounds like “des”', say: 'です' },
      { kana: 'いただきます', romaji: 'itadakimasu', note: 'said before eating: “itadakimas”' },
    ],
  },
  {
    id: 'sounds',
    level: 2,
    title: 'Sounds that differ from the romaji',
    body: [
      'ふ isn’t an English f: you blow gently through nearly closed lips, without touching your teeth. It sits between f and h.',
      'う is said with relaxed lips, not pushed forward. つ is the ts in “cats”, also at the start of a word. し and ち are softer than English “she” and “chee”, with the tongue flatter.',
    ],
    examples: [
      { kana: 'ふね', romaji: 'fune', note: 'ship: ふ between f and h' },
      { kana: 'ふゆ', romaji: 'fuyu', note: 'winter' },
      { kana: 'つき', romaji: 'tsuki', note: 'moon: ts at the start' },
      { kana: 'すし', romaji: 'sushi', note: 'sushi: relaxed u' },
      { kana: 'くち', romaji: 'kuchi', note: 'mouth' },
    ],
  },
  {
    id: 'small-vowels',
    level: 2,
    title: 'Small vowels for foreign sounds',
    body: [
      'Katakana uses a small ァ, ィ, ゥ, ェ or ォ after a kana to write sounds Japanese doesn’t have: ファ fa, フィ fi, ティ ti, ディ di, ウィ wi, ウェ we, シェ she, チェ che. Like small ゃ ゅ ょ, the small vowel joins the kana before it into one beat.',
      'ヴ (ウ with dakuten) writes a v, but most people say it as a b.',
    ],
    examples: [
      { kana: 'フォーク', romaji: 'fōku', note: 'fork: フォ fo' },
      { kana: 'カフェ', romaji: 'kafe', note: 'café: フェ fe' },
      { kana: 'パーティー', romaji: 'pātī', note: 'party: ティ ti' },
      { kana: 'ウェブ', romaji: 'webu', note: 'web: ウェ we' },
      { kana: 'ヴァイオリン', romaji: 'vaiorin', note: 'violin: ヴァ, often said “baiorin”' },
    ],
  },
  {
    id: 'ji-zu',
    level: 2,
    title: 'ぢ and づ',
    body: [
      'ぢ sounds just like じ (ji), and づ like ず (zu). They’re mostly written when a ち or つ becomes voiced in a compound (see “Sounds that change in compounds”), or when ち or つ is repeated: ちぢむ, つづく.',
      'To type them, use di and du.',
    ],
    examples: [
      { kana: 'つづく', romaji: 'tsuzuku', note: 'to continue: つ + づ' },
      { kana: 'はなぢ', romaji: 'hanaji', note: 'nosebleed: はな (nose) + ち (blood)' },
      { kana: 'みかづき', romaji: 'mikazuki', note: 'crescent moon: みか + つき (moon)' },
      { kana: 'ちぢむ', romaji: 'chijimu', note: 'to shrink' },
    ],
  },
  {
    id: 'rendaku',
    level: 2,
    title: 'Sounds that change in compounds (rendaku)',
    body: [
      'When two words are joined, the first sound of the second word often becomes voiced: て (hand) + かみ (paper) → てがみ (letter). This is called rendaku.',
      'It doesn’t always happen, and there’s no simple rule for when it does, so it’s learned word by word. It explains why some words are spelled with ぢ or づ.',
    ],
    examples: [
      { kana: 'てがみ', romaji: 'tegami', note: 'letter: て + かみ' },
      { kana: 'ともだち', romaji: 'tomodachi', note: 'friend: とも + たち' },
      { kana: 'いりぐち', romaji: 'iriguchi', note: 'entrance: いり + くち (mouth)' },
      { kana: 'ひとびと', romaji: 'hitobito', note: 'people: ひと + ひと' },
    ],
  },

  // ── Level 3 ─────────────────────────────────────────────────────────────────
  {
    id: 'n-apostrophe',
    level: 3,
    title: 'ん before a vowel or y',
    body: [
      'When ん comes before a vowel or y, romaji writes n’ to show where the beats split: きんえん kin’en (no smoking) is four beats, きねん kinen (anniversary) only three. In the same way ほんや hon’ya (bookshop) isn’t ほにゃ.',
      'To type ん before a vowel, type nn.',
    ],
    examples: [
      { kana: 'きんえん', romaji: 'kin’en', note: 'no smoking: き-ん-え-ん' },
      { kana: 'きねん', romaji: 'kinen', note: 'anniversary: き-ね-ん' },
      { kana: 'ほんや', romaji: 'hon’ya', note: 'bookshop: ほ-ん-や' },
    ],
  },
  {
    id: 'oo',
    level: 3,
    title: 'おお instead of おう',
    body: [
      'A long o is usually written おう, but some common words use おお: おおきい (big), おおい (many), とおい (far), とおる (to pass), こおり (ice), おおかみ (wolf). Both are said ō. In these words an h or w sound once stood between the two vowels.',
      'In the same way, a few words write a long e as ええ: ええ (yes), おねえさん (older sister).',
    ],
    examples: [
      { kana: 'おおきい', romaji: 'ōkii', note: 'big' },
      { kana: 'とおい', romaji: 'tōi', note: 'far' },
      { kana: 'こおり', romaji: 'kōri', note: 'ice' },
      { kana: 'おねえさん', romaji: 'onēsan', note: 'older sister: ええ → ē' },
    ],
  },
  {
    id: 'final-sokuon',
    level: 3,
    title: 'Small っ at the end',
    body: [
      'At the end of a word there’s nothing for a small っ to double. There it means a short, sudden stop, the way you cut off a cry of surprise.',
    ],
    examples: [
      { kana: 'あっ', romaji: 'a!', note: 'oh!', audio: 'a-stop', say: 'あっ' },
      { kana: 'えっ', romaji: 'e?', note: 'what?', audio: 'e-stop', say: 'えっ' },
    ],
  },
  {
    id: 'pitch',
    level: 3,
    title: 'Pitch accent',
    body: [
      'Japanese doesn’t stress a syllable: each beat is high or low, and words have their own melody. Some words differ only in that melody: はし is chopsticks when it goes high-low, and bridge when it goes low-high.',
      'Kana don’t show the pitch, and it differs between regions; dictionaries give the standard (Tokyo) pitch. It’s learned by listening, and you’re understood without it.',
    ],
    examples: [
      {
        kana: 'はし',
        romaji: 'hashi',
        note: 'chopsticks: high-low',
        audio: 'hashi-chopsticks',
        say: "ハ'シ",
        accent: true,
      },
      {
        kana: 'はし',
        romaji: 'hashi',
        note: 'bridge: low-high',
        audio: 'hashi-bridge',
        say: "ハシ'",
        accent: true,
      },
      {
        kana: 'あめ',
        romaji: 'ame',
        note: 'rain: high-low',
        audio: 'ame-rain',
        say: "ア'メ",
        accent: true,
      },
      {
        kana: 'あめ',
        romaji: 'ame',
        note: 'candy: low-high',
        audio: 'ame-candy',
        say: "アメ'",
        accent: true,
      },
    ],
  },
  {
    id: 'nasal-g',
    level: 3,
    title: 'A soft g in the middle of words',
    body: [
      'Traditionally, standard Japanese says a g inside a word, and the particle が, through the nose, like the ng in “singer”: かがみ ka-nga-mi.',
      'Only a minority of speakers still do this consistently, it has been fading for decades, and younger speakers mostly say a plain g. Both are correct; the app’s voices say a plain g.',
    ],
    examples: [
      { kana: 'かぎ', romaji: 'kagi', note: 'key: also said “kangi”' },
      { kana: 'たまご', romaji: 'tamago', note: 'egg: also said “tamango”' },
    ],
  },
  {
    id: 'special',
    level: 3,
    title: 'Rare and old characters',
    body: [
      'ゝ and ゞ (ヽ and ヾ in katakana) repeat the kana before them; ゞ adds a dakuten. You’ll mostly see them in names such as いすゞ (Isuzu).',
      'ゐ (wi) and ゑ (we) are old kana, now said i and e. They survive in names such as ヱビス (Yebisu beer).',
      'A small ヶ is said ka (and sometimes ga), as in 三ヶ月 sankagetsu (three months).',
    ],
    examples: [
      {
        kana: 'いすゞ',
        romaji: 'isuzu',
        note: 'Isuzu: ゞ repeats す with a dakuten',
        say: 'いすず',
      },
      { kana: 'ヱビス', romaji: 'ebisu', note: 'Yebisu: ヱ is said e', say: 'エビス' },
      { kana: '三ヶ月', romaji: 'sankagetsu', note: 'three months: ヶ is said ka' },
    ],
  },
]

/** Where the rules were checked. */
export const RULE_SOURCES: readonly { title: string; url: string }[] = [
  { title: 'Japanese phonology', url: 'https://en.wikipedia.org/wiki/Japanese_phonology' },
  { title: 'Rendaku', url: 'https://en.wikipedia.org/wiki/Rendaku' },
  { title: 'Sokuon', url: 'https://en.wikipedia.org/wiki/Sokuon' },
  { title: 'Japanese pitch accent', url: 'https://en.wikipedia.org/wiki/Japanese_pitch_accent' },
  { title: 'Yotsugana (ぢ and づ)', url: 'https://en.wikipedia.org/wiki/Yotsugana' },
]

export const RULES_BY_ID: ReadonlyMap<RuleId, Rule> = new Map(RULES.map((r) => [r.id, r]))

const DOUBLED: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'oo' }

/** The recording name of an example that isn't a practice word: plain ASCII, e.g. obaasan. */
export function exampleAudio(example: RuleExample): string {
  if (example.audio) return example.audio
  return example.romaji
    .replace(/[āīūēō]/g, (v) => DOUBLED[v])
    .replace(/’/g, '')
    .replace(/\s+/g, '-')
}

/** The rules about how a single kana is said or written, for its details card. */
export function rulesForKana(kana: Kana): RuleId[] {
  const ids: RuleId[] = []
  const marked = /[\u3099\u309a]/.test(kana.katakana.normalize('NFD'))
  if (marked) ids.push('dakuten')
  if (kana.group === 'yoon') ids.push('yoon')
  if (kana.group === 'extended') ids.push('small-vowels')
  if (kana.row === 'r' || kana.row === 'ry') ids.push('r')
  if (kana.id === 'n') ids.push('n', 'n-apostrophe')
  if (['ha', 'he', 'wo'].includes(kana.id)) ids.push('particles')
  if (['fu', 'shi', 'chi', 'tsu', 'u'].includes(kana.id)) ids.push('sounds')
  if (['ji', 'zu', 'di', 'du'].includes(kana.id)) ids.push('ji-zu')
  return ids
}

/** A rule in a language (falls back to English). */
export function localRule(rule: Rule, lang: Lang = 'en'): Rule {
  const nl = lang === 'nl' ? rulesNl[rule.id] : undefined
  if (!nl) return rule
  return {
    ...rule,
    title: nl.title,
    body: nl.body,
    examples: rule.examples.map((e, i) => ({ ...e, note: nl.notes[i] ?? e.note })),
  }
}
