import type { Lang } from '../i18n/format'
import { hintsNl } from './nl/confusables'

export interface ConfusableSet {
  id: string // e.g. 'shi-tsu'
  script: 'hiragana' | 'katakana' | 'mixed'
  /** Short title, e.g. 'シ vs ツ' */
  title: string
  /** The kana in the set, e.g. ['シ', 'ツ'] */
  chars: string[]
  /** One original, concrete, accurate hint per character on how to tell it apart (max ~110 characters each), keyed by the kana. */
  hints: Record<string, string>
}

export const confusableSets: ConfusableSet[] = [
  // ── Katakana ──────────────────────────────────────────────────────────────

  {
    id: 'shi-tsu',
    script: 'katakana',
    title: 'シ vs ツ',
    chars: ['シ', 'ツ'],
    hints: {
      シ: 'Two short dashes are stacked vertically on the left; the long stroke sweeps upward from the lower left.',
      ツ: 'Two short dashes sit side by side across the top; the long stroke falls downward from the upper right.',
    },
  },

  {
    id: 'so-n',
    script: 'katakana',
    title: 'ソ vs ン',
    chars: ['ソ', 'ン'],
    hints: {
      ソ: 'One short diagonal dash in the upper left; the long stroke curves downward from the upper right.',
      ン: 'One short nearly horizontal dash in the upper left; the long stroke sweeps upward from the lower area.',
    },
  },

  {
    id: 'shi-n-tsu-so',
    script: 'katakana',
    title: 'シ vs ン vs ツ vs ソ',
    chars: ['シ', 'ン', 'ツ', 'ソ'],
    hints: {
      シ: 'Two dashes stacked on the LEFT side; main stroke rises upward from the lower left.',
      ン: 'One dash upper-left (nearly horizontal); main stroke sweeps UPWARD from the lower right.',
      ツ: 'Two dashes side by side across the TOP; main stroke falls DOWNWARD from the upper right.',
      ソ: 'One dash upper-left (more diagonal); main stroke falls DOWNWARD from the upper right.',
    },
  },

  {
    id: 'ku-ke-ta',
    script: 'katakana',
    title: 'ク vs ケ vs タ',
    chars: ['ク', 'ケ', 'タ'],
    hints: {
      ク: 'A short horizontal at the top right, then a single stroke hooks from the upper right down to the lower left.',
      ケ: 'Three strokes: a vertical on the left, a horizontal crossing near the top, and a diagonal going lower right.',
      タ: 'Two strokes form an angled wedge at the top; a third stroke curves to the lower right with a trailing hook.',
    },
  },

  {
    id: 'u-wa-fu',
    script: 'katakana',
    title: 'ウ vs ワ vs フ',
    chars: ['ウ', 'ワ', 'フ'],
    hints: {
      ウ: 'A short top dash; below it, a wide open U-shape with a flat base — like a cup seen from the front.',
      ワ: 'A short stroke at the top left; the main body sweeps into a wide open arc, the right side curving inward.',
      フ: 'A single horizontal at the top with a hook curving down and to the left at the bottom — like a backward J.',
    },
  },

  {
    id: 'a-ma',
    script: 'katakana',
    title: 'ア vs マ',
    chars: ['ア', 'マ'],
    hints: {
      ア: 'A short diagonal on the top left; a horizontal bar is then crossed by a diagonal stroke falling to the lower left.',
      マ: 'A horizontal stroke at the top, then a single stroke sweeps down and curves to the right — no crossing stroke.',
    },
  },

  {
    id: 'ko-yu',
    script: 'katakana',
    title: 'コ vs ユ',
    chars: ['コ', 'ユ'],
    hints: {
      コ: 'Two horizontal strokes joined by a short vertical on the right — like a square bracket open to the left.',
      ユ: 'A short horizontal at the upper left, a vertical dropping from it, and a wider base stroke — like a J with a top serif.',
    },
  },

  {
    id: 'so-ri',
    script: 'katakana',
    title: 'ソ vs リ',
    chars: ['ソ', 'リ'],
    hints: {
      ソ: 'One short dash upper-left; a single long stroke curves down from the upper right — an asymmetric, comma-like shape.',
      リ: 'Two separate vertical strokes side by side; the left is shorter, the right is longer with a small hook at the base.',
    },
  },

  {
    id: 'na-me',
    script: 'katakana',
    title: 'ナ vs メ',
    chars: ['ナ', 'メ'],
    hints: {
      ナ: 'A horizontal stroke crossed by a vertical dropping straight down from the center — like a plus sign missing its left arm.',
      メ: 'Two diagonal strokes crossing near the center — one from upper left, one from upper right — forming an X shape.',
    },
  },

  {
    id: 'chi-te',
    script: 'katakana',
    title: 'チ vs テ',
    chars: ['チ', 'テ'],
    hints: {
      チ: 'Two short horizontals at the top; a vertical drops and curves outward to the left at the bottom — the base hooks left.',
      テ: 'Two horizontals (the lower one longer) joined by a short vertical — shaped like a capital T with an extra bar above.',
    },
  },

  {
    id: 'nu-su',
    script: 'katakana',
    title: 'ヌ vs ス',
    chars: ['ヌ', 'ス'],
    hints: {
      ヌ: 'A horizontal stroke at the top; below it, two strokes cross each other in an X pattern — a bar over a crossing.',
      ス: 'A horizontal stroke at the top; a single stroke dips from the center and curves leftward at the bottom — a bar over a swoop.',
    },
  },

  // ── Hiragana ──────────────────────────────────────────────────────────────

  {
    id: 'nu-me',
    script: 'hiragana',
    title: 'ぬ vs め',
    chars: ['ぬ', 'め'],
    hints: {
      ぬ: 'Two loops: the left body curves into an open outward spiral, and a small knotted loop sits in the upper-right area.',
      め: 'A more enclosed circular outer loop; the inside spirals inward tightly — rounder and more closed overall than ぬ.',
    },
  },

  {
    id: 'ne-re-wa',
    script: 'hiragana',
    title: 'ね vs れ vs わ',
    chars: ['ね', 'れ', 'わ'],
    hints: {
      ね: 'Left vertical with a crossbar; the right side loops around and closes into a small loop at the lower right.',
      れ: 'Like ね but the bottom right does not close — the stroke curves outward and trails off without looping.',
      わ: 'No crossbar on the left stroke; the right side curves and returns inward — simpler than ね or れ.',
    },
  },

  {
    id: 'ru-ro',
    script: 'hiragana',
    title: 'る vs ろ',
    chars: ['る', 'ろ'],
    hints: {
      る: 'A stroke curves around and closes into a loop at the bottom, then spirals inward — the bottom is a closed loop.',
      ろ: 'Like る but the bottom does not close into a loop — the stroke curves and trails off openly to the right.',
    },
  },

  {
    id: 'ha-ho',
    script: 'hiragana',
    title: 'は vs ほ',
    chars: ['は', 'ほ'],
    hints: {
      は: 'Left vertical stroke; the right side has a crossbar and a descending loop — two components on the right.',
      ほ: 'Like は but with an extra short horizontal bridging the upper-right area — three components on the right instead of two.',
    },
  },

  {
    id: 'sa-chi',
    script: 'hiragana',
    title: 'さ vs ち',
    chars: ['さ', 'ち'],
    hints: {
      さ: 'A horizontal at the top, a vertical crossing it, then a loop curving to the right below — three distinct strokes.',
      ち: 'A horizontal arcs down and to the right, then a large rounded loop sweeps leftward below — no crossing vertical.',
    },
  },

  {
    id: 'ki-sa',
    script: 'hiragana',
    title: 'き vs さ',
    chars: ['き', 'さ'],
    hints: {
      き: 'Three horizontal strokes; the bottom two are connected on the right by a curved loop — more complex than さ.',
      さ: 'One horizontal at the top, one crossing vertical, one rightward loop — simpler shape with fewer strokes than き.',
    },
  },

  {
    id: 'i-ri',
    script: 'hiragana',
    title: 'い vs り',
    chars: ['い', 'り'],
    hints: {
      い: 'Two strokes: a short left arc that curves inward, and a longer right stroke that curves down and sweeps back leftward.',
      り: 'Two strokes: the left is short and nearly straight, the right hangs longer and hooks sharply to the left at the bottom.',
    },
  },

  {
    id: 'ko-ni',
    script: 'hiragana',
    title: 'こ vs に',
    chars: ['こ', 'に'],
    hints: {
      こ: 'Two horizontals connected at their right ends by a short vertical — like a square bracket facing left.',
      に: 'A horizontal on top, a vertical dropping from it, then a baseline extending further right — more strokes than こ.',
    },
  },

  {
    id: 'a-o-me',
    script: 'hiragana',
    title: 'あ vs お vs め',
    chars: ['あ', 'お', 'め'],
    hints: {
      あ: 'A horizontal bar crossed by a vertical, then a large wide loop sweeps to the left — the loop opens to the right.',
      お: 'Like あ but has an extra small horizontal stroke inside the lower-right of the loop — the loop is slightly more enclosed.',
      め: 'No horizontal bar across the top; the shape is a tightly spiraling oval — closer to a circle than あ or お.',
    },
  },

  {
    id: 'nu-ne',
    script: 'hiragana',
    title: 'ぬ vs ね',
    chars: ['ぬ', 'ね'],
    hints: {
      ぬ: 'The upper-right has a knotted loop; the lower body curves into an open outward spiral — the right knot is the key.',
      ね: 'A clear crossbar on the left vertical; the right side makes one loop that closes neatly below — no upper-right knot.',
    },
  },

  {
    id: 'u-tsu',
    script: 'hiragana',
    title: 'う vs つ',
    chars: ['う', 'つ'],
    hints: {
      う: 'A short dash on top; below, a rounded stroke curves down and back up in an open bowl shape — the top dash sets it apart.',
      つ: 'No top dash; a single stroke sweeps in a wide arc from upper right all the way around — like a round fishhook.',
    },
  },

  {
    id: 'ma-mo',
    script: 'hiragana',
    title: 'ま vs も',
    chars: ['ま', 'も'],
    hints: {
      ま: 'A horizontal crossed by a vertical at the top, then a rounded loop at the bottom — three clean strokes, no extra hooks.',
      も: 'Like ま but two small hooks curve to the right off the vertical body — more strokes and more angular hooks than ま.',
    },
  },

  {
    id: 'ra-chi',
    script: 'hiragana',
    title: 'ら vs ち',
    chars: ['ら', 'ち'],
    hints: {
      ら: 'A short horizontal at the top left, then a stroke curves down and loops out to the right — a simple rightward tail.',
      ち: 'A horizontal arcs down and to the right, then a large loop sweeps leftward underneath — the loop goes left, unlike ら.',
    },
  },

  {
    id: 'ta-na',
    script: 'hiragana',
    title: 'た vs な',
    chars: ['た', 'な'],
    hints: {
      た: 'A cross at the top left, a diagonal stroke going right, and a small loop at the lower right — more angular overall.',
      な: 'A cross shape, then a wide rightward loop with a small separate stroke dangling inside the loop area — looser shape.',
    },
  },

  // ── Mixed (hiragana ↔ katakana look-alikes) ───────────────────────────────

  {
    id: 'he',
    script: 'mixed',
    title: 'へ vs ヘ',
    chars: ['へ', 'ヘ'],
    hints: {
      へ: 'Hiragana — a gentle mountain-peak stroke with a slightly rounder curve at the peak and a longer left slope.',
      ヘ: 'Katakana — nearly identical to へ but slightly more angular at the peak and with a shorter, straighter left side.',
    },
  },

  {
    id: 'ri',
    script: 'mixed',
    title: 'り vs リ',
    chars: ['り', 'リ'],
    hints: {
      り: 'Hiragana — the right stroke curves noticeably to the left at the bottom, giving a flowing, rounded finish.',
      リ: 'Katakana — both strokes are straighter and more vertical; the right ends in a sharper, less curved hook.',
    },
  },

  {
    id: 'ka',
    script: 'mixed',
    title: 'か vs カ',
    chars: ['か', 'カ'],
    hints: {
      か: 'Hiragana — a vertical with two strokes on the right forming a curved, loop-like shape — rounder and more flowing.',
      カ: 'Katakana — a diagonal from upper right to lower left, crossed by a short horizontal — angular and simpler than か.',
    },
  },

  {
    id: 'ki',
    script: 'mixed',
    title: 'き vs キ',
    chars: ['き', 'キ'],
    hints: {
      き: 'Hiragana — three horizontals with the lower two linked by a small curved loop on the right — flowing and complex.',
      キ: 'Katakana — three horizontals cleanly bisected by a single vertical — a symmetric cross shape with no loops at all.',
    },
  },

  {
    id: 'se',
    script: 'mixed',
    title: 'せ vs セ',
    chars: ['せ', 'セ'],
    hints: {
      せ: 'Hiragana — has a clear curved stroke wrapping around the right side of the character — the curve is the key feature.',
      セ: 'Katakana — an angular bracket-like shape with no curves; sharper and more geometric than せ.',
    },
  },

  {
    id: 'mo',
    script: 'mixed',
    title: 'も vs モ',
    chars: ['も', 'モ'],
    hints: {
      も: 'Hiragana — a vertical with a crossing horizontal and two small curved hooks on the right — curvy and asymmetric.',
      モ: 'Katakana — three clean horizontal strokes with a vertical connecting the lower two — looks like a blocky capital E.',
    },
  },

  {
    id: 'ya',
    script: 'mixed',
    title: 'や vs ヤ',
    chars: ['や', 'ヤ'],
    hints: {
      や: 'Hiragana — a diagonal stroke with a curved loop on the right and a small separate stroke on the left — rounded overall.',
      ヤ: 'Katakana — a horizontal at the top, a vertical dropping from the center, and a short diagonal on the left — angular.',
    },
  },
]

/** The hint for a kana in a confusable set, in a language (falls back to English). */
export function confusableHint(set: ConfusableSet, char: string, lang: Lang = 'en'): string {
  return (lang === 'nl' && hintsNl[set.id]?.[char]) || set.hints[char]
}
