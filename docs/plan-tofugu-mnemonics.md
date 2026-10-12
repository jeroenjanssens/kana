# Memory hints and drawings from Tofugu's Learn Hiragana and Learn Katakana books

The 46 basic hiragana and 46 basic katakana use the "how to remember" hints and drawings from
Tofugu's [Learn Hiragana](https://www.tofugu.com/japanese/learn-hiragana-book/) and
[Learn Katakana](https://www.tofugu.com/japanese/learn-katakana-book/) books, credited in NOTICE,
the README and the Credits page. Dakuten, yōon and extended katakana keep their rule-based hints
and have no drawing.

## Decisions

- **Text**: transcribed from the PDF and checked against renders of each page. The book underlines
  the sound; that becomes the usual `*emphasis*` (seven katakana hints underline nothing, so they
  have no emphasis). The katakana book's text layer is unreliable (most headings read テ, リ's
  hint says "hiragana リ"), so pages are identified by their first line and the text was checked
  against renders; ス's box repeats the pronunciation line, which is left out. Paragraphs are kept (separated by a blank line)
  and the full text is shown everywhere: introduction, card back and the table's details. The two
  hints that show a handwritten form (き, り) mark it as `{き}`, shown in Klee One.
- **Dutch**: a faithful translation, keeping the English word where the pun needs it ("paling —
  in het Engels *ee*ls"), and using Dutch where it works (*ka*p ermee, *koe*koek, *noe*dels).
- **Drawings**: `scripts/tofugu-drawings.ts` (`just tofugu`) handles both books. It takes each page's drawing (a 150 ppi
  image over a pale copy of the kana), splits it by colour into paper, tint and ink layers,
  upscales 3× and traces each with potrace. The page's bold kana is matched against the drawing to
  find where the kana sits, so every drawing shares one em box (overflow, like す's flying kid, is
  allowed). Output: `src/lib/data/tofugu/drawings/{script}/{id}.json`, loaded on demand (≈ 1 MB
  gzipped for all 92, none of it in the first load). `just tofugu-preview` builds a page comparing every
  trace with its original in both themes.
- **Look**: the layers take the app's colours — ink in `--ink`, the tint a soft indigo wash
  (`--ai` mixed into the paper), white parts in `--paper` — with multiply blending on light paper,
  so they follow the theme.
- **Alignment**: the drawings are traced around Tofugu's own kana, so they can't sit on the app's
  fonts. While a drawing is shown, it replaces the glyph: its own kana in the tint, the lines on
  top.
- **Setting** (`drawings`): Off / After the answer (default: introduction, card back, details) /
  Always (also the card front — off by default because many drawings give the answer away).
  A "Drawing" button on the card, introduction and details, and the `D` key, toggle it for the
  side in view and remember the choice.
- **Kanji**: メ's hint uses 目, so it was added to the UI kanji in the font subsets.
- **Hint labels**: wherever both scripts' hints are shown (table details, combined deck), each is
  labelled Hiragana or Katakana.
- **Card size**: the paper card is at least 5 : 6 and grows with its content up to what fits on
  screen; beyond that the back scrolls, so the answer buttons stay in place.
