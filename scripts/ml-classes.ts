/** Write ml/classes.json: the model's sound classes, from the app's kana (`just ml-classes`). */
import { writeFileSync } from 'node:fs'
import { kanaById } from '../src/lib/data/kana'
import { NO_KANA, SOUND_CLASSES } from '../src/lib/speech/classes'

const classes = SOUND_CLASSES.map((c) => {
  const k = kanaById(c.kana[0])
  // VOICEVOX's kana notation (as for the app's audio): katakana, accent on the first mora.
  return { id: c.id, kana: c.kana, hiragana: k.hiragana, notation: `${k.katakana}'` }
})
const out = { noKana: NO_KANA, classes }
writeFileSync('ml/classes.json', JSON.stringify(out, null, 2) + '\n')
console.log(`ml/classes.json: ${classes.length} sounds + "${NO_KANA}"`)
