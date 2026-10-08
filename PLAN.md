# kana — Implementation Plan

A polished browser app for learning hiragana and katakana. It uses spaced repetition (like Anki), has an in-order study mode, and includes drills, listening practice, stroke-order animations, reading practice and stats. The visual style is inspired by Japan: flashcards look like ink on washi paper, set against rotating photos of Japan.

Built with Svelte 5, TypeScript and Vite, deployed to GitHub Pages at `https://jeroenjanssens.github.io/kana/`. All progress is stored in the browser, and the app can be installed and used offline as a PWA.

Each design decision below lists a **default** (what I'll build unless you say otherwise) and an **alternative**. Decisions you have already made are marked ✅.

> **Status (2026-10-08): all milestones M0–M12 are implemented** and deployed to
> https://jeroenjanssens.github.io/kana/. Where the build differs from this plan:
>
> - **Fonts (D10):** instead of `@fontsource` packages (≈124 files per font), `scripts/subset-fonts.ts` downloads the fonts from the google/fonts repository and cuts each one down to kana, Latin and the UI kanji. That's one file per font, 1.7 MB for all 15, and all of them are pre-cached for offline use.
> - **Pronunciation (D5), revised in round 1:** the Commons recordings were replaced by audio generated with VOICEVOX: every kana (yōon included) and every word, in a female (春日部つむぎ) and a male (青山龍星) voice, with a Female / Male / Random setting. See [docs/plan-improvements-1.md](docs/plan-improvements-1.md).
> - **Sound effects (D18):** 13 effects, all CC0. 10 are from Freesound and 3 were generated with ffmpeg. The koto note is a *kayageum* (Korean zither) pluck. Since round 1 its pitch follows the grade (Hard low, Good middle, Easy high) instead of a streak melody.
> - **Reading practice (§2.8):** 392 hand-written words. Accepted typed spellings and tags are generated from the kana, and a test checks every word's Hepburn romaji against its kana.
> - **Tooling (D12):** ESLint + Prettier + svelte-check, Vitest (≈1,050 unit tests), and Playwright (≈70 e2e tests on desktop and mobile, including offline use).
> - **Lighthouse:** desktop scores 99 / 100 / 100 / 100 (performance, accessibility, best practices, SEO). Mobile scores 79 for performance (simulated slow 4G) and 100 for accessibility.

---

## 1. Look & feel

The goal is that it feels like a beautifully made physical object, not a quiz website.

### 1.1 Visual language

| Element | Treatment |
|---|---|
| **Palette** | *Washi* off-white `#F4EFE6` (paper), *sumi* ink `#1C1B19` (text), *shu* vermilion `#C73E1D` (accents, seals), *ai* indigo `#264A6E` (links, focus), *matcha* `#7A8B4F` (mastery). The dark theme uses a charcoal paper tone with ivory ink. |
| **UI typography** | Japanese headings in **Shippori Mincho**, Latin UI text in **Inter** (or Source Serif for a more literary feel). Kana on cards use the font system from §2.3. |
| **Paper cards** | Cards have a washi texture, soft rounded corners, a faint deckle edge, a subtle drop shadow, and a slight random tilt (±0.6°) so they don't look machine-placed. |
| **Ink** | The kana sit on the paper with a slight bleed: an SVG filter makes the edges a little irregular, and the ink colour is blended into the paper with `multiply`. On reveal, the kana fade in with a short ink-spread animation. |
| **Card flip** | A real 3D flip (`transform: rotateY`) with the back of the card showing the same paper texture. |
| **Hanko seal** | A red *inkan*-style stamp (e.g. 習 / 熟) appears with a little "thunk" animation when a card becomes **mature**. The same seal marks mastered cells in the overview table. |
| **Motion** | Gentle and purposeful: page transitions, a background cross-fade, a slow Ken Burns pan on photos. Everything respects `prefers-reduced-motion`. |
| **Sound design** | Traditional, understated sound effects (koto, wood, paper, bells). See §2.14. |

**D13. Paper texture**
- *Default:* **Generated in the browser** with SVG `feTurbulence` noise plus fibre overlays. It's resolution-independent, takes under 2 KB, has no licensing issues, and gives each card subtly different fibres.
- *Alternative:* A photographed washi texture (from a CC0 source, about 100–200 KB, tiled). It looks more photographic but repeats visibly on large cards.

**D14. Ink effect**
- *Default:* **An SVG filter** on the kana glyphs (`feTurbulence` + `feDisplacementMap` + slight blur), together with brush-like fonts. It works with any font, including random fonts.
- *Alternative:* Pre-rendered ink-brush images of each kana. They look more realistic, but you can't change the font, which conflicts with the font features.

### 1.2 Rotating photo backgrounds
- About **20–30 curated photos of Japan**: Tokyo at night, Shibuya, Kyoto temples and torii, bamboo forest, cherry blossoms, autumn maples, rice terraces, the Japanese Alps, and **Mount Fuji**.
- **Rotation:** a new photo every *N* cards or every few minutes (this is a setting), with a slow cross-fade. The home screen shows a "photo of the day".
- **Readability:** a soft dark gradient and a slight blur sit behind the cards and panels, so text always meets WCAG AA contrast whatever the photo.
- **Credits:** a small, unobtrusive credit in the corner ("Photo: Name / Unsplash"), plus a full credits page.
- **Performance:** each photo is self-hosted in AVIF and WebP at several sizes (`srcset`, roughly 150–300 KB at desktop size). Only the next photo is preloaded, and the PWA caches the photos you've already seen rather than all of them.
- **Settings:** photos on/off, rotation interval, a "calm mode" with plain paper only, and "data saver" mode, which turns photos off automatically on metered connections.

**D15. Photo source**
- *Default:* **Unsplash**, with downloaded photos self-hosted in the repo. The Unsplash License allows free use, including bundling the photos in an app, and doesn't require attribution, although I'll credit the photographers anyway. Hotlinking would require the Unsplash API with a key and request tracking, which doesn't suit a static site, so the photos will be self-hosted. I'll pick the photos during implementation and show you a contact sheet for approval before they're committed.
- *Alternative:* **Wikimedia Commons** photos that are public domain or CC0, or CC BY with attribution. The licensing is more transparent, but there are fewer polished, magazine-quality shots. **Pexels** is a second alternative with a licence similar to Unsplash's.

---

## 2. Features

### 2.1 Decks
Every mode below works with three **decks**:
- **Hiragana**: the front shows `あ`
- **Katakana**: the front shows `ア`
- **Combined**: the front shows `あ ア` side by side

**Character scope:**
- 46 basic kana, 25 dakuten/handakuten kana, and 33 yōon combinations, for each script.
- Extended katakana (ファ ティ ヴ …) can be switched on but are off by default.
- Obsolete kana (ゐ ゑ) are left out.
- New cards are introduced in table order, so you learn a row before moving on.

### 2.2 Study modes

| Mode | What it does | Affects SRS? |
|---|---|---|
| **SRS review** | Anki-style reviews, with due cards first and then new cards. You grade each card Again / Hard / Good / Easy. | Yes |
| **In order** | Goes through the cards in table order, regardless of past performance. You can pick a range and loop. | No (see D6) |
| **Confusable pairs** | Drills look-alike sets (see §2.6). | No (see D16) |
| **Listening** | Plays a sound; you pick the kana from 4–6 choices. | Its own SRS card type (see D17) |
| **Reading practice** | Short real words built from kana you already know. | No; it has its own progress tracking |

**Answer style** can be set per mode where it makes sense:
- **Self-grade** (the default), as in Anki: reveal the card, then grade it.
- **Typed answer**: you type the romaji and it's checked against accepted spellings (e.g. `shi` or `si`). The app suggests a grade from correctness and response time (fast and correct → *Good* or *Easy*; slow → *Hard*; wrong → *Again*), and you can override the suggestion with one key.

**The back of a card shows:**
- the romaji
- a ▶ play button (it can also auto-play on reveal)
- the other script as a hint
- the name of the font
- a **stroke-order** button (§2.5)
- a **font gallery** strip (§2.4)

### 2.3 Fonts
- **Fixed font**: choose one font from a curated list.
- **Random font**: each card picks a font at random from the fonts you've enabled. You can switch each font on or off.

| Style | Fonts |
|---|---|
| Gothic | Noto Sans JP, M PLUS 1p |
| Mincho | Noto Serif JP, Shippori Mincho |
| Textbook / handwriting | **Klee One**, Yomogi |
| Rounded | Zen Maru Gothic, Kosugi Maru, M PLUS Rounded 1c |
| Brush / ink | **Yuji Syuku**, Yuji Mai |
| Display | Dela Gothic One, RocknRoll One, Hachi Maru Pop, DotGothic16 |
| System | whatever Japanese font the OS provides |

Fonts are self-hosted through the `@fontsource/*` packages. These split each font into `unicode-range` chunks, so the browser only downloads the small chunk that contains kana. Each font is loaded the first time it's needed.

### 2.4 Font gallery
- The back of a card has a horizontal strip that shows the same kana in every enabled font, each one labelled.
- A full-screen gallery view is available from both the card and the overview table.
- It helps you notice how much some kana change between fonts, for example き/さ (joined or separate strokes), ふ, そ (one stroke or two), and り.

### 2.5 Stroke-order animations
- The stroke data comes from **KanjiVG**, which includes hiragana and katakana, licensed CC BY-SA 3.0.
- Each stroke is drawn in turn using `stroke-dashoffset`. Stroke numbers are shown, and you can play, step through, and replay.
- The animation is shown in an ink-on-paper style to match the cards.
- It's available on the card back and in a popover on table cells.
- Yōon are shown as their two components, with the small ゃ/ゅ/ょ scaled down.
- Licensing: the KanjiVG data stays under CC BY-SA in its own folder (`src/data/kanjivg/`, with a `LICENSE`). It's credited in `NOTICE` and on the credits page, while the rest of the app's code is MIT.

### 2.6 Confusable-pairs drill
- **Curated sets:** シ/ツ, ソ/ン, シ/ン/ツ/ソ, ク/ケ/タ, ウ/ワ/フ, ア/マ, コ/ユ, ぬ/め, ね/れ/わ, る/ろ, は/ほ, さ/ち, き/さ, い/り, こ/に, ソ/リ, plus hiragana–katakana look-alikes such as へ/ヘ, り/リ, か/カ.
- **Step 1, Compare:** the set is shown side by side, with the distinguishing features highlighted (e.g. "シ strokes go *up* from left; ツ strokes go *down* from top").
- **Step 2, Quiz:** a rapid-fire round where one kana is shown and you pick its romaji, drawn only from that set.
- **Personalised sets:** the drill also suggests sets based on your mistakes. If you often confuse two kana (in typed or listening answers), they become a suggested pair.

**D16. Does the confusable drill update SRS?**
- *Default:* **No.** It's a practice tool, but it does write to the review log, so the stats include it.
- *Alternative:* Missing a pair counts as a lapse on the kana you got wrong.

### 2.7 Listening cards
- The app plays a sound and you choose the kana. The wrong choices are picked on purpose to sound or look similar (e.g. し/ち/じ, つ/す/ず).
- **Only the 71 kana that have recordings** (basic + dakuten) get listening cards. Yōon are left out until audio is added.

**D17. How listening is scheduled**
- *Default:* **A separate SRS card type** ("listen → kana") per script, with its own schedule. Recognising a kana when you hear it is a different skill from reading it.
- *Alternative:* An unscheduled practice mode, like the confusable-pairs drill.

### 2.8 Reading practice
- Uses a **hand-curated list of about 300 common words**, which I'll write myself to avoid licensing issues. Each word has its kana, romaji, an English meaning, and tags: hiragana, katakana loanword, or containing っ, ー or long vowels.
- **Unlocking:** a word appears only when every kana in it is at least *young* in the relevant deck. The first words appear after just the あ and か rows (あい, かお, いえ…).
- **Format:** the word is shown on a card, you read it (by self-grading or typing the romaji), and then the meaning is revealed.
- **Pronunciation teaching:** this is also where っ (small tsu, doubled consonant), ー (long vowel mark), long vowels (おう, えい) and particle readings (は → wa) are taught in context. Each gets a short illustrated note the first time you meet it.
- **Audio ✅:** none for words, because the Commons set only covers single sounds. See §3, D5.

### 2.9 Overview tables
- A traditional gojūon grid, with collapsible sections for dakuten/handakuten and yōon.
- Layout: **separate** tables (hiragana and katakana) or **combined** (each cell shows `あ ア`).
- **Romaji** can be toggled on and off.
- **Click or tap** a cell to hear the sound. Cells without audio (the yōon) have no play affordance.
- **Mastery overlay:** each cell is coloured by state (new, learning, young, mature), and mature cells get the hanko seal. Hovering or long-pressing shows reviews, lapses, next due date, recall probability, and buttons for the stroke-order animation and the font gallery.

### 2.10 Stats page
- A **review heatmap** for the past year, in a GitHub-contribution style with ink-wash colours.
- Current and longest **streak**.
- A **due forecast** for the next 14 days.
- **Mastery progress** per deck: a stacked bar of new, learning, young and mature cards, plus a "kana mastered" count (e.g. 52 / 104).
- **Weakest 10 kana**, ranked by lapses and recall probability, with a "Drill these" button.
- **Most-confused pairs**, taken from typed and listening mistakes, which feeds §2.6.
- **Average answer time** per kana, if you use typed mode.
- The charts are SVG, written by hand to keep dependencies small and to match the ink style.

### 2.11 Settings
- Daily limits: 10 new cards and 200 reviews per day by default.
- Character sets.
- Font mode and the set of fonts for random mode.
- Answer style.
- Auto-play audio.
- Whether to show the other script on the back.
- Romaji system: Hepburn by default, or Kunrei.
- Theme: system, light or dark.
- Photo backgrounds: on/off, interval, calm mode, data saver.
- Sound: master mute, a sound-effects volume and a pronunciation volume, set separately (see §2.14).
- Reduced motion: follows the OS setting by default.
- **Export / import** progress as JSON, and reset (with confirmation).

### 2.12 Installable PWA / offline
- Built with `vite-plugin-pwa` (Workbox).
- **Pre-cached:** the app code, pronunciation audio (about 71 × 8 KB ≈ 0.6 MB), sound effects (≈ 300 KB), the kana chunks of the default fonts, and the KanjiVG data.
- **Cached at runtime:** photos and the other fonts.
- Comes with an install prompt, an app icon (a hanko-style 仮 or あ), and a splash screen.
- When a new version is deployed, a "new version available" toast lets you reload.
- On iOS, installing the app to the Home Screen also protects your progress from Safari's 7-day storage eviction.

### 2.13 Keyboard & accessibility
- **Shortcuts:**
  - `Space` reveals the answer.
  - `1`–`4` grade the card.
  - `P` plays the sound.
  - `M` mutes or unmutes sound effects.
  - `S` shows the stroke order.
  - `F` opens the font gallery.
  - `←/→` move back and forward in in-order mode.
  - `Esc` returns home.
  - `?` opens a cheat sheet.
- Full keyboard navigation, visible focus rings, ARIA labels (e.g. "Hiragana card, shi"), and WCAG AA contrast.
- On touch screens: tap to reveal, large grade buttons, and swipe gestures for in-order mode.

### 2.14 Sound effects
The sound effects are traditional, understated and sophisticated, more like a tea house than a slot machine. They should be quiet, short (mostly under 1 s), never harsh, and they never play over the pronunciation.

**Sound palette, per event:**

| Event | Sound |
|---|---|
| Card reveal / flip | A soft **washi paper** rustle |
| Grade *Good* / *Easy*, correct answer | A single **koto** pluck. Consecutive correct answers climb a pentatonic scale (*miyako-bushi*), so a streak becomes a small melody. A miss resets it. |
| Grade *Again*, wrong answer | A muted, low **wooden "tock"** (like a mokugyo). It signals the miss without a buzzer. |
| Card becomes **mature** (hanko stamp) | A soft **stamp thud** followed by a small **rin** (temple bowl) chime |
| Session complete | A sustained **singing bowl** or a gentle **fūrin** (wind chime) |
| New row unlocked, streak milestone, all kana mastered | **Hyōshigi** clappers, or the clack of a **shishi-odoshi** (bamboo deer scarer) |
| UI navigation (tabs, toggles) | A barely audible wooden tick. **Off by default.** |

**Controls:**
- A **speaker button** in the header and the **`M`** key mute or unmute sound effects instantly.
- In settings, **sound effects** and **pronunciation** each have their own volume slider and mute. Muting effects never silences the pronunciation.
- A master **silent mode** mutes everything. It's handy in a library or on the train.
- **Defaults:** effects on at 50%, pronunciation at 100%, UI ticks off.
- **Ducking:** while a pronunciation clip plays, effects are delayed or ducked.

**Implementation:**
- A small **Web Audio API** engine (`src/audio/engine.ts`) with separate gain buses for *voice* and *sfx* under a master gain.
- All clips are decoded once into `AudioBuffer`s for zero-latency playback. The engine starts on the first user interaction, which browser autoplay policies require.
- **Variation:** 2–3 recordings per event, plus a random pitch shift of about ±3% and a small volume variation, so the effects never sound repetitive.
- **Processing:** `scripts/process-sfx.ts` (ffmpeg) trims each clip, adds short fades, normalises it to a level well below the voice, and encodes it to MP3. The total budget is about 300 KB, all pre-cached for offline use.

**D18. Sound-effect source**
- *Default:* **Curated recordings from Freesound.org, CC0 only**. CC0 means no attribution is required, although each sound is still credited, and there's no NC/BY-SA complexity. I'll pick a shortlist and let you listen to it on a small preview page before committing anything.
- *Alternative:* **Synthesise them with Web Audio**: Karplus-Strong for the koto pluck, additive synthesis for bells, filtered noise for paper. There are zero assets and no licensing questions, but it's harder to make it sound truly authentic. A hybrid also works, with synthesised koto notes (which gives exact pitches for the streak melody) and recorded paper, wood and bells.

**Background music: out of scope.** You'll use Spotify yourself. Because all of our audio goes through the Web Audio buses, it can play alongside other apps without fighting over audio focus.

---

## 3. Design decisions

**D1. UI framework ✅**
- **Decided: Svelte 5** (runes), using plain Svelte + Vite (the `svelte-ts` template). No SvelteKit is needed for a single-page app on GitHub Pages.
- The UI (views and components) is written in `.svelte` files.
- Shared reactive state lives in `.svelte.ts` modules that use `$state`.
- The domain logic (kana data, SRS, storage, audio engine) is **plain TypeScript with no Svelte imports**, so it's framework-independent and easy to unit test.
- Built-in transitions handle the card reveal, background cross-fade, hanko stamp and page changes.

**D2. SRS algorithm**
- *Default:* **FSRS** via `ts-fsrs`.
- *Alternative:* SM-2.

**D4. Romanisation**
- *Default:* **Hepburn**, with Kunrei as a setting. Typed answers accept both.

**D5. Audio ✅**
- **Decided:** the **Wikimedia Commons set by Hakatanoshio117117**, which is public domain and recorded by a single speaker. It covers all **46 basic + 25 dakuten/handakuten** sounds, 71 files in total.
  - I've checked that the full set exists, including `Japanese ka.ogg` and `Japanese so.ogg`, which aren't in the category listing.
  - Some files use Kunrei names: `hu` → fu, `ti` → chi, `zi` → ji, `di` → ぢ, `du` → づ, and `Ja-A.oga`/`Ja-E.oga` for あ/え. A mapping table takes care of this.
  - ぢ/づ have their own recordings, so they don't need to reuse じ/ず.
- **Missing audio:** the yōon have **no audio**. Their play button is hidden, and a "no recording yet" note appears in the table popover. There is no text-to-speech fallback.
- **Processing:** a one-off script (`scripts/fetch-audio.ts`, using `ffmpeg`) downloads the files, **trims the silence** (the raw clips are 2.5–3.5 s long), normalises loudness and encodes them to **MP3** (mono, 64 kbps, about 8 KB each). MP3 is used because every browser, including Safari, plays it. The processed files are committed to `public/audio/`, so CI doesn't need the network or ffmpeg. The source URLs and licences are recorded in `public/audio/SOURCES.json`.

**D6. In-order mode and SRS**
- *Default:* in-order mode doesn't touch SRS.
- *Alternative:* in-order grades optionally count as reviews.

**D7. Decks**
- *Default:* **independent schedules** for hiragana, katakana and combined. The listening cards (D17) are additional decks.
- *Alternative:* combined mode simply interleaves the two single-script decks.

**D8. Storage**
- *Default:* **`localStorage`** with a versioned schema and migrations, and `navigator.storage.persist()`.
- *Alternative:* **IndexedDB**. The review log now grows faster because more modes write to it, but it's still well under 5 MB after years of daily use. If it ever gets close, older log entries are compacted into daily summaries.

**D9. Default answer style**
- *Default:* **self-grade**.
- *Alternative:* typed answer.

**D10. Fonts**
- *Default:* **self-hosted** via `@fontsource`.
- *Alternative:* Google Fonts with `&text=` subsetting.

**D11. Routing**
- *Default:* **hash routing** with a tiny router of my own (about 40 lines, built on `$state` and the `hashchange` event).
- *Alternative:* the `svelte-spa-router` package, or the History API with the `404.html` trick.

**D12. Tooling**
- *Default:*
  - npm
  - Vitest
  - **ESLint (`eslint-plugin-svelte`) + Prettier (`prettier-plugin-svelte`)**
  - `svelte-check` for type checking, with strict TypeScript
  - **Playwright** for a few smoke tests and screenshots

  *(This changes the earlier default of Biome, because Biome's support for `.svelte` files is still partial, whereas the ESLint and Prettier plugins are the official, mature Svelte tooling.)*
- *Alternative:* pnpm; Biome for the `.ts` files only.

D13–D18 are covered in §1–§2 above.

---

## 4. Architecture

```
kana/
├── index.html
├── vite.config.ts              # base: '/kana/', svelte + PWA plugins
├── svelte.config.js
├── public/
│   ├── audio/                  # 71 × mp3 pronunciation + SOURCES.json
│   ├── sfx/                    # sound effects (mp3) + SOURCES.json
│   ├── photos/                 # avif/webp at 3 widths + credits.json
│   └── icons/                  # PWA icons
├── scripts/
│   ├── fetch-audio.ts          # Commons → trimmed mp3
│   ├── process-sfx.ts          # Freesound originals → trimmed, levelled mp3
│   └── process-photos.ts       # originals → avif/webp srcset (sharp)
├── src/
│   ├── main.ts                 # mounts App.svelte
│   ├── App.svelte              # shell: background, header, router outlet
│   ├── lib/                    # ── plain TypeScript, no Svelte imports ──
│   │   ├── data/
│   │   │   ├── kana.ts         # master list
│   │   │   ├── confusables.ts  # curated sets + hints
│   │   │   ├── words.ts        # ~300 reading-practice words
│   │   │   ├── fonts.ts        # catalogue + lazy loaders
│   │   │   └── kanjivg/        # stroke SVG data (CC BY-SA, own LICENSE)
│   │   ├── srs/                # scheduler (ts-fsrs), queues, mastery
│   │   ├── audio/
│   │   │   ├── engine.ts       # Web Audio: master/voice/sfx buses, ducking
│   │   │   ├── voice.ts        # playSound(kanaId)
│   │   │   └── sfx.ts          # play('flip' | 'correct' | …), variants, pitch
│   │   └── storage/            # schema, migrate, backup
│   ├── state/                  # ── reactive state (*.svelte.ts, $state) ──
│   │   ├── settings.svelte.ts
│   │   ├── progress.svelte.ts
│   │   └── router.svelte.ts    # tiny hash router
│   ├── components/             # ── reusable UI ──
│   │   ├── PaperCard.svelte    # texture, ink filter, 3D flip
│   │   ├── Washi.svelte        # paper texture generator (SVG filters)
│   │   ├── Hanko.svelte        # seal stamp
│   │   ├── Background.svelte   # photo rotator
│   │   ├── StrokeOrder.svelte
│   │   ├── FontGallery.svelte
│   │   ├── SoundToggle.svelte  # header mute + volume popover
│   │   └── charts/             # Heatmap, StackedBar, Forecast (SVG)
│   ├── views/
│   │   ├── Home  Study  Confusables  Listening  Reading
│   │   └── Table  Stats  Settings  Credits      (.svelte)
│   └── styles/                 # tokens.css, paper.css, motion.css …
├── tests/                      # vitest (lib/) + playwright smoke
├── NOTICE                      # third-party credits
└── .github/workflows/deploy.yml
```

### Data model (core)

```ts
type Script = 'hiragana' | 'katakana';
type DeckId = 'hiragana' | 'katakana' | 'combined' | 'listen-hiragana' | 'listen-katakana';

interface Kana {
  id: string;          // 'shi', 'kya' — shared by both scripts
  hiragana: string;    // 'し'
  katakana: string;    // 'シ'
  romaji: string;      // Hepburn
  alt: string[];       // accepted alternatives, e.g. ['si']
  group: 'basic' | 'dakuten' | 'yoon' | 'extended';
  row: string; col: number; order: number;
  audio?: string;      // 'audio/shi.mp3' — absent for yōon
}

interface Word {
  kana: string; romaji: string; meaning: string;
  script: Script; tags: ('sokuon' | 'choon' | 'long-vowel' | 'loanword')[];
}

interface ReviewLog {  // shared by all modes, powers stats
  t: number; mode: 'srs' | 'order' | 'confusable' | 'listen' | 'reading';
  deck?: DeckId; id: string; correct: boolean; grade?: 1|2|3|4;
  ms: number; answered?: string;   // what you picked/typed → confusion matrix
}

interface SaveFile {
  version: 1;
  settings: Settings;
  cards: Partial<Record<DeckId, Record<string, { fsrs: import('ts-fsrs').Card }>>>;
  words: Record<string, { seen: number; correct: number; last: number }>;
  log: ReviewLog[];
  daily: { date: string; newShown: Partial<Record<DeckId, number>> };
}
```

---

## 5. Milestones

| # | Milestone | Contents |
|---|---|---|
| **M0** | Scaffold & deploy | Vite + Svelte 5 + TypeScript, ESLint/Prettier, svelte-check, Vitest, Playwright, GitHub Actions → Pages. A placeholder page live. |
| **M1** | Design system | Colour tokens, typography, light/dark themes, the **paper card** (texture, ink filter, 3D flip), the hanko seal, the photo-background rotator with a first set of photos, and motion with reduced-motion support. *This comes early so every later feature is built in the final style.* |
| **M2** | Data & audio | The kana dataset with tests; the audio fetch and trim script; 71 MP3s committed; the **Web Audio engine** (voice and effect buses, mute, volume); the **sound-effect shortlist and preview page** for your approval, then processing. Effects are wired up to events as each feature is built. |
| **M3** | Overview tables | Separate and combined layouts, romaji toggle, click-to-play. |
| **M4** | Flashcards: in order | Decks, range selection, fonts (fixed and random), keyboard and touch controls. |
| **M5** | SRS | ts-fsrs, queues, daily limits, persistence, a home screen with due counts and the photo of the day. |
| **M6** | Mastery & settings | Table overlay and popovers, the full settings page, export/import/reset. |
| **M7** | Typed answers + font gallery | |
| **M8** | Stroke order | KanjiVG import, the animation component, and integration into cards and tables. |
| **M9** | Confusable pairs + listening | Curated sets, the compare and quiz flows, listening SRS decks, distractor choice, and the confusion matrix. |
| **M10** | Stats page | Heatmap, streaks, forecast, weakest kana, confused pairs. |
| **M11** | Reading practice | The word list, unlocking logic, and the notes on っ, ー and particles. |
| **M12** | PWA & polish | Offline caching, install prompt, update toast, a Lighthouse pass (target ≥ 95 for performance and accessibility), the credits page, and a README with screenshots and a GIF. |

---

## 6. Repository, licensing & deployment

- **Repo:** `github.com/jeroenjanssens/kana`, public.
- **Licences:**
  - App code: **MIT**.
  - KanjiVG stroke data: **CC BY-SA 3.0**, kept in its own folder with its licence.
  - Fonts: **SIL OFL**.
  - Audio: **public domain** (Hakatanoshio117117, Wikimedia Commons).
  - Photos: **Unsplash License**, credited per photo.
  - Sound effects: **CC0** (Freesound), credited per sound.
  - Everything is listed in `NOTICE` and on the in-app credits page.
- **Deploy:** GitHub Actions workflow (`configure-pages` → `upload-pages-artifact` → `deploy-pages`) on every push to `main`, gated on lint, typecheck, unit tests and the Playwright smoke tests.
- Commits are authored by Jeroen Janssens.
