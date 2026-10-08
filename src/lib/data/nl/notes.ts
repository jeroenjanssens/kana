type Note = { title: string; body: string; example: string }

/** Dutch versions of the notes on dakuten, handakuten, yōon and small vowels. */
export const kanaNotesNl: Partial<Record<'dakuten' | 'handakuten' | 'yoon' | 'small-vowel', Note>> =
  {
    dakuten: {
      title: 'Twee kleine streepjes: dakuten ゛',
      body: 'De twee kleine streepjes rechtsboven maken de klank stemhebbend: k → g, s → z, t → d, h → b.',
      example: 'か ka → が ga, さ sa → ざ za, は ha → ば ba',
    },
    handakuten: {
      title: 'Een klein rondje: handakuten ゜',
      body: 'Een klein rondje rechtsboven verandert de h-rij in een p-klank.',
      example: 'は ha → ぱ pa, ひ hi → ぴ pi',
    },
    yoon: {
      title: 'Klein ゃ ゅ ょ smelt samen',
      body: 'Een kleine ya, yu of yo na een i-rij-kana smelt ermee samen tot één lettergreep.',
      example: 'き ki + ゃ → きゃ kya, し shi + ょ → しょ sho',
    },
    'small-vowel': {
      title: 'Kleine klinkers voor buitenlandse klanken',
      body: 'In katakana maakt een kleine ァ ィ ゥ ェ ォ na een kana klanken die het Japans niet heeft.',
      example: 'フ fu + ァ → ファ fa, テ te + ィ → ティ ti',
    },
  }

/** Dutch versions of the reading-practice notes (っ, ー, long vowels, yōon). */
export const readingNotesNl: Partial<Record<'sokuon' | 'choon' | 'long-vowel' | 'yoon', Note>> = {
  sokuon: {
    title: 'Klein っ verdubbelt de volgende medeklinker',
    body: 'Een kleine っ (ッ in katakana) wordt niet uitgesproken als "tsu". Het maakt een korte pauze en verdubbelt de medeklinker die volgt.',
    example: 'がっこう → gakkō, ねっこ → nekko',
  },
  choon: {
    title: 'ー maakt een klinker lang',
    body: 'In katakana rekt het lange streepje ー de klinker ervóór uit tot ongeveer het dubbele.',
    example: 'コーヒー → kōhī, ケーキ → kēki',
  },
  'long-vowel': {
    title: 'Lange klinkers in hiragana',
    body: 'In hiragana wordt een klinker verlengd door een extra klinker toe te voegen: あ, い of う na dezelfde klinker, い na e, en meestal う na o.',
    example: 'おかあさん → okāsan, せんせい → sensē, がっこう → gakkō',
  },
  yoon: {
    title: 'Klein ゃ ゅ ょ smelt samen tot één klank',
    body: 'Een kleine ゃ, ゅ of ょ na een i-rij-kana smelt ermee samen tot één lettergreep.',
    example: 'き + ゃ → きゃ (kya), し + ょ → しょ (sho)',
  },
}
