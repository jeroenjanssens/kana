type Note = { title: string; body: string; example: string }

/** Dutch versions of the notes on dakuten, handakuten, yōon and small vowels. */
export const kanaNotesNl: Partial<Record<'dakuten' | 'handakuten' | 'yoon' | 'small-vowel', Note>> =
  {}

/** Dutch versions of the reading-practice notes (っ, ー, long vowels, yōon). */
export const readingNotesNl: Partial<Record<'sokuon' | 'choon' | 'long-vowel' | 'yoon', Note>> = {}
