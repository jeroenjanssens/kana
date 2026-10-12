import type { Lang } from '../i18n/format'
import { kanaByChar, type Kana, type Script } from './kana'
import { mnemonicsNl } from './nl/mnemonics'
import { kanaNotesNl } from './nl/notes'

/** A hint of several paragraphs. */
function paragraphs(...texts: string[]): string {
  return texts.join('\n\n')
}

/**
 * Memory hints for the basic kana, from Tofugu's Learn Hiragana and Learn Katakana books
 * (https://www.tofugu.com/japanese/learn-hiragana-book/,
 * https://www.tofugu.com/japanese/learn-katakana-book/), used with credit; they go with the books'
 * drawings (src/lib/data/tofugu). The sound in the hint is in *asterisks* (where the book
 * underlines one), and a kana in {braces} is shown in a textbook font.
 * Dakuten, handakuten, yōon and extended katakana get a hint built from their parts.
 */
const BASIC: Record<string, { hiragana: string; katakana: string }> = {
  a: {
    hiragana: paragraphs(
      'Look closely, and find the letter *A* inside of it.',
      'There is another similar hiragana, お, but that one doesn’t have an *A* in it, which is how you can differentiate them.',
    ),
    katakana:
      'ア has a deformed capital letter *A* in it. You have to turn your head to the side and connect some lines, but it’s there.',
  },
  i: {
    hiragana: paragraphs(
      'To remember this kana, just think of a couple of *ee*ls hanging out.',
      'They’re upright because they’re trying to mimic the letter i, which also stands upright and happens to be the way you spell out this character in romaji.',
    ),
    katakana:
      'イ looks like an *ea*gle standing on the ground, or on a branch, or wherever. See its legs and its back, curved down like an eagle’s?',
  },
  u: {
    hiragana: paragraphs(
      'To remember this kana, notice the *U* shape right in it!',
      'There’s another similar hiragana, つ, but that one isn’t wearing a hat like *U* (you) are. Ooh, ahh, what a nifty hat!',
    ),
    katakana: paragraphs(
      'This katakana character looks a lot like its hiragana counterpart: う.',
      'It should be similar enough to use as a mnemonic to remember what it is.',
    ),
  },
  e: {
    hiragana: paragraphs(
      'Look at this kana and find the *e*xotic bird laying *e*xotic *e*ggs inside of it.',
      'The feather on its head gives away that it’s special and exotic, and the flourish looks like its body and tail. How adorable!',
    ),
    katakana: paragraphs(
      'Imagine this is a girder an *e*ngineer would use to build buildings. This character is in the shape of the end of a girder, and it’s made up of them too.',
      'Or you can think of it like an *e*levator with its doors closed.',
    ),
  },
  o: {
    hiragana: paragraphs(
      'Can you see the letter *o* in here, two times? This one looks similar to あ, except for one key difference: there are two letter *o* symbols visible in there.',
      'Make sure you use this to differentiate this kana お and the similar kana あ.',
    ),
    katakana:
      'This kana looks like an *o*pera singer. His mouth is shaped like an o and he’s singing "*Oh*hhh!"',
  },
  ka: {
    hiragana:
      'See how this kana looks like a mosquito? What a convenient coincidence! Mosquitos happen to be called か (*ka*) in Japanese. You also say "*cu*t it out, darn mosquito!" when they try to suck your blood, so that should be easy to remember.',
    katakana:
      'It looks just like the hiragana か, though it’s missing that little extra line. Close enough to make it easy to remember, though.',
  },
  ki: {
    hiragana: paragraphs(
      'Notice how the shape of き resembles a *key*?',
      'Note: In some fonts, the bottom part is detached from the main part. For example: {き}. The pronunciation is still *ki* though!',
    ),
    katakana:
      'It looks like the hiragana き (the top part at least) and also looks like part of a weird *key*.',
  },
  ku: {
    hiragana:
      'To remember this, think of this kana being the mouth of a *coo*-coo / *cu*ckoo bird popping out and saying "*ku* ku, ku ku!".',
    katakana: 'This looks like a long *coo*k’s hat. What are they hiding under there?!',
  },
  ke: {
    hiragana: 'See how this kana resembles some wiggly *ke*lp?',
    katakana: 'It looks like the letter *K*!',
  },
  ko: {
    hiragana: paragraphs(
      'こ is a couple of *co*-habitating worms. They’re so happy together, *co*-habitating the same area!',
      'Alternatively, you could imagine a couple of short *co*rds lying on the ground next to each other.',
    ),
    katakana:
      'See the two 90 degree *co*rners? The two *co*rners are what help you to remember that this is "ko."',
  },
  sa: {
    hiragana: paragraphs(
      'Notice how this kana looks like two hands stirring a bowl of *sa*lsa.',
      'This *sa*lsa is so chunky and thick, you need two hands just to stir it!',
    ),
    katakana: paragraphs(
      'Look at these two fish that are hanging on a skewer. The small one is a *sa*rdine and the bigger one is a *sa*lmon. You can tell that by the size difference.',
      'You can also remember this is *sa* because fish are called *さ*かな (*sa*kana) in Japanese.',
    ),
  },
  shi: {
    hiragana: paragraphs(
      'This kana looks like a giant shepherd’s crook used to herd *shee*p.',
      'Baaaa… get in that corral, *shee*p!',
    ),
    katakana:
      'This kana looks like a smiley face, but something is wrong with it. Both eyes are sideways and stacked on top of each other like some deep *sea* fish. *She* has a very weird face.',
  },
  su: {
    hiragana: paragraphs(
      'See the *s*wing doing a loop-dee-loop and throwing that poor kid off of it?',
      'Imagine him screaming "I’M GONNA *SUE* SOMEBODY FOR THIIIIIiiiissss" as he flies off into the distance.',
    ),
    katakana: paragraphs(
      'What’s that up there? It’s *Su*perman walking in the sky!',
      'Wait — upon closer inspection, it’s just his disembodied *su*per*su*it. …W-Where the heck did he go naked?',
    ),
  },
  se: {
    hiragana: paragraphs(
      'This kana looks like a mouth with a big vampire fang in it. Someone’s trying to *se*ll you a *se*t of vampire teeth because they are just so *se*xy!',
      'Oh Dracula, always trying to make a quick buck.',
    ),
    katakana:
      'It looks really similar to the hiragana せ, so you should be able to use that to remember this kana.',
  },
  so: {
    hiragana: 'See how this kana looks like a mouth slurping *so*da?',
    katakana: paragraphs(
      'It is one needle and a long thread, which you use to *sew*.',
      'Remember, needles are always vertical like this needle, because you need to stab it through something, straight down. This will help you to differentiate this one and the very similar ン, the katakana for "n."',
    ),
  },
  ta: {
    hiragana: paragraphs(
      'Use your imagination and see this kana as a fork, *ta*co, and lime garnish for your *ta*co.',
      'Wait… you’re eating a *ta*co with a fork? That’s a bit weird, but you do you, pal.',
    ),
    katakana:
      'タ looks like a kite. Kites are called *た*こ (*ta*ko) in Japanese. This is actually a taco kite, too. It looks exactly like a giant taco flying high in the sky. Tacos are all the rage these days!',
  },
  chi: {
    hiragana:
      'You know when someone tells you to say "*chee*se" when taking a picture of you? This kana looks like that forced smile you have to make every time you’re in a group photo.',
    katakana: 'Doesn’t this look like a *chee*rleader doing a *chee*r? Hope they don’t fall over…',
  },
  tsu: {
    hiragana: 'Look at the swoosh of this hiragana. Doesn’t it look like a big wave, or *tsu*nami?',
    katakana: paragraphs(
      'While ソ (so) had one needle and thread, ツ has two needles and thread.',
      'Remember, needles are vertical because you use them to stab into cloth, straight down. This will help you to differentiate this one from シ (shi), which has more horizontal lines. Horizontal lines means it’s a face, vertical means it’s needles. So this one has *two* needles.',
    ),
  },
  te: {
    hiragana: paragraphs(
      'Can you see a good ol’ *te*lescope?',
      'It’s a hand-held one! In Japanese, "hand" is て (*te*). That should help you remember that this kana looks like an old-school hand(*te*)-held *te*lescope.',
    ),
    katakana: 'This kana looks like a *te*lephone pole.',
  },
  to: {
    hiragana:
      'This kana looks just like someone’s *toe* with a little nail or splinter in it. Imagine how much this would hurt if it was your *toe*!',
    katakana: 'It looks just like a *to*tem pole.',
  },
  na: {
    hiragana: paragraphs(
      'The *nu*n is praying in front of the cross asking for *na*chos, because she’s craving a delicious snack!',
      'The cross up in the air should be the main giveaway that this is な.',
    ),
    katakana: 'See the majestic *na*rwhal, swimming up to the surface? What a beautiful creature.',
  },
  ni: {
    hiragana: 'Do you see the *nee*dle pulling the thread?',
    katakana:
      'This is two *nee*dles, laying on their side. Now, don’t get confused about how I said that needles are always vertical… that’s only with the katakana that have the slope in them (ソ and ツ). When they’re on their own, resting, and not being used to sew anything (no thread), they’re just two needles lying on their side.',
  },
  nu: {
    hiragana:
      'This kana looks like some *noo*dles. There are several other kana that are similar to this one (れ, め, ね, わ), but you know this one is noodles because there are no sharp angles in it. It’s 100% smooth and bendable, like noodles! It even has an extra loop at the bottom, because it is a noodle.',
    katakana: 'The chopsticks are grabbing some *noo*dles and pulling them out of a bowl.',
  },
  ne: {
    hiragana: paragraphs(
      'This is *Ne*lly the cat. There are other kana very similar to this one (ぬ, れ, め, わ), but you know this is different. Why? Because it has a loop at the end for the tail, and it’s not super bendable like ぬ (noodles) is — see those sharp corners on the left?',
      'To top things off, *Ne*lly is a *ne*cromancer. Why? I have no idea, you’ll have to ask her. It must have something to do with the undead cat army she’s creating.',
      'Also, if you know the word "*ne*ko" (Japanese for "cat"), you can use that too. This is a ねこ.',
    ),
    katakana:
      'Look, this kana looks like a horse (*neigh*!) jumping over a hurdle. Never gamble, kids!',
  },
  no: {
    hiragana:
      'See the big pig *no*se there? You can also think of this as a "*No* smoking" sign (the one with the cigarette and big red circle/slash through it). Pick the one that sticks with you the best.',
    katakana: 'It looks like a really long *no*se.',
  },
  ha: {
    hiragana: paragraphs(
      'This kana looks like an uppercase letter *H* plus a lowercase letter *a*.',
      'What does that spell? "*Ha*!"',
      'Why are you laughing? Stop that. Make sure you can see the *H+a* in the kana.',
    ),
    katakana:
      'This is shaped like one of those rice paddy *ha*ts. You’ll have to connect the pieces, but you can see it, right?',
  },
  hi: {
    hiragana: '*He* has a big nose. See that big nose? Now say it out loud. "*He* has a big nose."',
    katakana: '*He* is saying "*hee*hee." Can you see his cheeky grin?',
  },
  fu: {
    hiragana:
      'Someone is over there dancing like a *foo*l. What’s that around their neck? …Oh, that’s a *hu*la *hoo*p! That’s why they’re twisting their body so hard.',
    katakana: paragraphs(
      'フ looks like a *f*lag that’s triangle-shaped. *Hoo*ray for the triangle flag!',
      'You’ll need to use your imagination to add the stick/flagpole, but you’ll know フ is a flag waving in the wind when you see that triangle shape.',
    ),
  },
  he: {
    hiragana: paragraphs(
      'Do you know the famous mountain Mt. Saint *He*lens? This kana isn’t totally flat like *He*lens is, but it’s pretty squat-looking.',
      'That’s why this one is Helens. If it ever erupts again, people will need *he*lp!',
    ),
    katakana: 'This katakana looks just like the hiragana へ. If you know one, you know them both!',
  },
  ho: {
    hiragana:
      'The line on the left is a chimney. The right side is a mutated Santa Claus. He has four arms, a snake tail, and no head. Out of his neck he’s uttering "*ho* *ho* ho… ho ho ho…" Hopefully he doesn’t come down your chimney.',
    katakana: 'This is a *ho*ly cross. You can even see *ho*ly light coming off of it. So *ho*ly.',
  },
  ma: {
    hiragana:
      'Removing your head? Doubling your hands and arms? What sort of evil *ma*gic is this? What makes it weirder is that your *ma*ma is the one doing this magic. Imagine your *ma* looking like this. Aghh!',
    katakana: 'Look at all those angles! Those lengths! Those measurements! All that *ma*th!',
  },
  mi: {
    hiragana: paragraphs(
      'Looks like lucky number 21. Who just hit the blackjack? *Me*! Who just turned 21 as well? *Me*!!',
      'Listen to me sing my own birthday song… *mi* mi Mi MIIIIIIII!',
    ),
    katakana: paragraphs('Three *mi*ssiles, flying towards you.', 'Be careful!'),
  },
  mu: {
    hiragana: paragraphs('"*Moo*oooo," says the cow.', '"*MOO*OOOOO."'),
    katakana: paragraphs('It is shaped like a cow’s friendly face.', 'Look at that snout! *Moo*!'),
  },
  me: {
    hiragana: paragraphs(
      'Look at that beautiful eye! It’s so beautiful because of the *ma*keup on it. Gotta look pretty in the eyes, or else your ensemble will just be "*meh*."',
      'If you also happen to know the word for "eye" in Japanese, that will help too. The word for "eye" in Japanese is just め (*me*).',
    ),
    katakana: paragraphs(
      'This looks like an "X" over someone’s *目 (め)* — "eye" in Japanese.',
      '*Meh*, I guess they’re dead now.',
    ),
  },
  mo: {
    hiragana: 'You want to catch *mo*re fish, so you add *mo*re worms to your hook.',
    katakana:
      'This looks very similar to the hiragana も, so you should be able to make that connection and remember both of these.',
  },
  ya: {
    hiragana: paragraphs(
      'See how this kana looks like a *ya*cht with an anchor going down? It’s even got a little flag on the rear… how cute.',
      'Alternatively, you can think of this as the face of a *ya*k too!',
    ),
    katakana: 'This looks just like the hiragana や, minus a little line.',
  },
  yu: {
    hiragana:
      'This kana is a very *u*nique looking fish! It looks like a big eyeball swimming in the water. What’s it looking at? *You*, *you* big goofball! Isn’t it weird how fish always look like they’re staring at *you*?',
    katakana: '*You* have a hook for a hand. What are *you*, a pirate?',
  },
  yo: {
    hiragana:
      '*Yo*, this kana looks like the letters Y & O! And look, you can even play *yo*-yo with it. Look at it slide down and back up again… it’s mesmerizing, *yo*.',
    katakana:
      'See how this kana looks like someone doing *yo*ga? Only a *yo*gi could bend into such a boxy position.',
  },
  ra: {
    hiragana:
      'ら looks like a *ra*bbit that’s standing and facing left. Look at its big droopy ears. So cute!',
    katakana: 'It is a *ra*ptor wearing some sweet sunglasses like a *ra*pper.',
  },
  ri: {
    hiragana: paragraphs(
      'The *ree*ds are swaying in the wind.',
      'This kana is also commonly written without the connection in the middle, like {り}, which looks even more reed-like.',
    ),
    katakana: 'It looks just like the hiragana り, or at least very, very similar.',
  },
  ru: {
    hiragana: paragraphs(
      'This is just ろ (which you will learn in a sec) with a *loo*p at the end.',
      'る is a crazier *rou*te. Why? Because there’s a *loo*p at the end.',
    ),
    katakana: 'There are two *rou*tes you can take: *Rou*te One and *Rou*te Two.',
  },
  re: {
    hiragana: paragraphs(
      'This looks like a guy kneeling on the ground, *re*tching up his dinner.',
      'This kana is similar to め, わ, ぬ, and ね. What makes this one different is the curve at the back. You can identify this as the guy’s knees bending, which makes it clear that he’s keeled over *re*tching his guts out.',
    ),
    katakana: 'Look at that beautiful *re*d hair that *Re*i has! It’s so flowy!',
  },
  ro: {
    hiragana:
      'This is the counterpart to る, except this one doesn’t have a loop at the end. So this kana is just a plain old *ro*ad.',
    katakana:
      'This *ro*ad goes around in a square, never ending. What a terrible road this is. What are you, a twelve-year-old playing Sim City?',
  },
  wa: {
    hiragana: paragraphs(
      'This kana looks like a *wa*sp flying straight up.',
      'It looks similar to れ, ぬ, ね, and め. And it looks especially similar to ね. You know ね is Nelly the cat because of the curl of the tail on the end. So you can imagine the cat chasing this wasp, which is why it’s flying straight up to get away. Its butt is also a straight, sharp line. This is its stinger!',
    ),
    katakana:
      'This kana looks like a question mark. When you ask a question, you often begin with the word *what*. What are you doing? What are you wearing? What are you not wearing?',
  },
  wo: {
    hiragana:
      '"*Who*a!" yells the guy with no chin. Someone threw a boomerang into his mouth! That’s pretty "*who*a"-worthy, I think.',
    katakana:
      'To remember ヲ is "wo," think of a dog *woo*fing so hard its tongue is flying out. "*Oh*!" you exclaim, taken aback by this dog’s tongue.',
  },
  n: {
    hiragana:
      'This kana looks just like a lowercase *n* in English. They happen to be the same sounds as well. How convenient! *nnn* んんん.',
    katakana: paragraphs(
      'Do you remember how シ is a lady with a weird face? The two little dashes are more horizontal than vertical, which helps us to know it’s a face.',
      'So, what about ン? It’s a ma*n* who has only *one* eye. *Mmn*nnnnn, but why only one eye, you ask? Don’t ask, I don’t know.',
    ),
  },
}

const SMALL: Record<string, string> = {
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
  ャ: 'ya',
  ュ: 'yu',
  ョ: 'yo',
  ァ: 'a',
  ィ: 'i',
  ゥ: 'u',
  ェ: 'e',
  ォ: 'o',
}

/** The kana without its dakuten (゛) or handakuten (゜), e.g. が → か. */
function baseOf(char: string): string | undefined {
  const decomposed = char.normalize('NFD')
  if (decomposed.length < 2) return undefined
  return decomposed[0]
}

export type KanaNote = 'dakuten' | 'handakuten' | 'yoon' | 'small-vowel'

/** The rule-based notes that explain how a kana is built. */
export function notesForKana(kana: Kana): KanaNote[] {
  const text = kana.katakana
  const notes: KanaNote[] = []
  if (/[゙゛]/.test(text.normalize('NFD'))) notes.push('dakuten')
  if (/[゚゜]/.test(text.normalize('NFD'))) notes.push('handakuten')
  if (/[ャュョ]/.test(text)) notes.push('yoon')
  if (/[ァィゥェォ]/.test(text)) notes.push('small-vowel')
  return notes
}

export const KANA_NOTES: Record<KanaNote, { title: string; body: string; example: string }> = {
  dakuten: {
    title: 'Two small marks: dakuten ゛',
    body: 'The two small strokes at the top right make the sound voiced: k → g, s → z, t → d, h → b.',
    example: 'か ka → が ga, さ sa → ざ za, は ha → ば ba',
  },
  handakuten: {
    title: 'A small circle: handakuten ゜',
    body: 'A small circle at the top right turns the h-row into a p-sound.',
    example: 'は ha → ぱ pa, ひ hi → ぴ pi',
  },
  yoon: {
    title: 'Small ゃ ゅ ょ blend in',
    body: 'A small ya, yu or yo after an i-row kana merges with it into a single syllable.',
    example: 'き ki + ゃ → きゃ kya, し shi + ょ → しょ sho',
  },
  'small-vowel': {
    title: 'Small vowels for foreign sounds',
    body: 'In katakana, a small ァ ィ ゥ ェ ォ after a kana makes sounds that Japanese doesn’t have.',
    example: 'フ fu + ァ → ファ fa, テ te + ィ → ティ ti',
  },
}

/** A note on how a kana is built, in a language (falls back to English). */
export function kanaNote(note: KanaNote, lang: Lang = 'en') {
  return (lang === 'nl' && kanaNotesNl[note]) || KANA_NOTES[note]
}

/** A memory hint for a kana in a script. */
export function mnemonicFor(kana: Kana, script: Script, lang: Lang = 'en'): string {
  const text = script === 'hiragana' && kana.hiragana ? kana.hiragana : kana.katakana
  const which = script === 'hiragana' && kana.hiragana ? 'hiragana' : 'katakana'
  const own = (lang === 'nl' && mnemonicsNl[kana.id]) || BASIC[kana.id]
  if (own) return own[which]

  const chars = [...text]
  if (chars.length === 2) {
    const base = kanaByChar(chars[0])
    const small = SMALL[chars[1]]
    if (base && small) {
      return lang === 'nl'
        ? `${chars[0]} ${base.romaji} + een kleine ${chars[1]} ${small} → één lettergreep: ${kana.romaji}.`
        : `${chars[0]} ${base.romaji} + a small ${chars[1]} ${small} → one syllable: ${kana.romaji}.`
    }
  }
  const baseChar = baseOf(chars[0])
  const base = baseChar ? kanaByChar(baseChar) : undefined
  if (base) {
    const circle = text.normalize('NFD').includes('゚')
    if (lang === 'nl') {
      const mark = circle ? 'een klein rondje (゜)' : 'twee streepjes (゛)'
      return `${baseChar} ${base.romaji} met ${mark}: dezelfde vorm, nu uitgesproken als ${kana.romaji}.`
    }
    const mark = circle ? 'a small circle (゜)' : 'two marks (゛)'
    return `${baseChar} ${base.romaji} with ${mark}: the same shape, now pronounced ${kana.romaji}.`
  }
  return ''
}

/** The paragraphs of a hint. */
export function hintParagraphs(hint: string): string[] {
  return hint.split('\n\n')
}

export interface HintPart {
  text: string
  /** The sound, emphasised. */
  em: boolean
  /** A kana shown in a textbook font, e.g. to show a handwritten form. */
  textbook?: boolean
}

/** Render a hint paragraph as HTML-safe parts: the *starred* sound is emphasised. */
export function hintParts(hint: string): HintPart[] {
  return hint
    .split(/(\*[^*]+\*|\{[^}]+\})/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('*')
        ? { text: part.slice(1, -1), em: true }
        : part.startsWith('{')
          ? { text: part.slice(1, -1), em: false, textbook: true }
          : { text: part, em: false },
    )
}
