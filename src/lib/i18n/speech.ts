/**
 * The texts for speaking (speech test page, Say it, record & compare). Importing this module adds
 * them; it's imported by the speech components, so the texts load with them, not on first visit.
 */
import { addMessages } from './messages'
import en from './en/speech'
import nl from './nl/speech'

addMessages({ en, nl })
