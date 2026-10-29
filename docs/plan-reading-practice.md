# Reading practice: plan

> **Status (2026-10-29): implemented.** Differences from this plan:
>
> - The word list also has a "Sort by" menu with a button to reverse the order: on a phone the column headings are hidden, and it's the only way to sort by due date. Clicking a heading a third time goes back to the list order.
> - Phrases have up to six words: in "えいご の メニュー は あります か" the particles and です/か count as words too.
> - VOICEVOX misread three of the 500 new items from the kana (はち as "wachi", and いろは and はいりません as words); they're recorded from kanji instead (`WORD_READINGS` in `scripts/generate-audio.ts`, next to the readings for the rule examples), not `say` on the word. The readings of all 500 were checked against VOICEVOX's own reading of them.
> - The new words and phrases live in `src/lib/data/travel.ts` (Dutch: `nl/travel.ts`), after the first 507.
> - On the back of the card, a phrase's romaji is smaller, so it doesn't take three lines.

Changes to reading practice (`#/reading`):

1. Long words and phrases fit on the card, on phones too.
2. A setup panel: script, words and/or phrases, spaces between words, and the length of a round (or unlimited).
3. Spaced repetition for words: words you miss come back sooner (and within the round).
4. Four answers (Again · Hard · Good · Easy) instead of two.
5. A word list instead of the wall of chips: a table with romaji, meaning, both voices and how you're doing, collapsible, sortable and searchable.
6. About 500 new words and phrases, chosen for travelling in Japan.

"Words" below means words and phrases, unless it says otherwise.

---

## 1. Long words and phrases on a phone

**The problem.** The front of the card uses a fixed size: 5rem, or 3.6rem for words of more than four characters (`Reading.svelte`), and `KanaGlyph` doesn't wrap (`white-space: nowrap`). On a 375 px wide phone the card is 330 px wide and its content is 282 px (1.5rem padding). At 3.6rem (57.6 px) per character:

| Characters | Words | Width at 3.6rem |
|---|---|---|
| 5 | 42 | 288 px (just too wide) |
| 6 | 11 | 346 px |
| 7 | 5 | 403 px (ゆうびんきょく, アムステルダム, インターネット, コンピューター, アイスクリーム) |

Wide fonts make it worse, and the smaller kana (ゅ, ッ) are still a full em wide.

**Words: scale to the card.** Size the word to the width of the card, not with a fixed step:

- `PaperCard`'s `.content` becomes a size container (`container-type: inline-size`).
- The front sets `size` to `min(5rem, calc(92cqi / n))`, with `n` the number of characters. Short words stay at 5rem; a 7-character word on a phone becomes about 37 px. `cqi` is supported in all current browsers (Safari 16+).
- The same on the back (`min(2.4rem, …)`) and in the word card in the modal (`WordCard.svelte`, `min(3.4rem, …)`), which also overflows at 2.6rem for 7 characters.
- A small helper (`wordSize(parts, max)` in `reading.ts`) so every place uses the same formula, with a unit test.
- A single word never breaks across lines.

**Phrases: wrap between words.** A phrase is drawn as its words, each an unbreakable inline block, so it wraps between words and never inside one:

- With spaces on (see 2), there's a visible gap between the words (about a third of the font size).
- With spaces off, the words touch, as in normal Japanese, but it still wraps only at word boundaries.
- Size: `min(3.6rem, calc(92cqi / n))`, with `n` the length of the *longest word* in the phrase, so the longest word fits on a line and the phrase takes at most three lines.

**Tests.** An e2e test at a 360 × 740 viewport: the longest word and the longest phrase don't overflow the card, in the widest font (Dela Gothic One), with spaces on and off; a phrase wraps only between words.

## 2. The setup panel

The overview's start panel becomes a setup panel like Sprint's and Race's, with four fields. All are new settings, synced, and validated like the others (only the known values, anything else falls back to the default).

| Field | Choices | Setting | Default |
|---|---|---|---|
| Script | Hiragana · Katakana · Both (`ScriptPicker`) | `readingScript` | `both` (what it does now) |
| Practise | Words · Phrases · Both | `readingKind` | `both` |
| Spaces between words | on / off | `readingSpaces` | on |
| Cards per round | 10 · 15 · 25 · 50 · ∞ | `readingCount` (`0`: unlimited) | `15` (the current round) |

Under the fields: "8 due · 3 new · 214 unlocked" for the current choice, and Start. If nothing is unlocked for the choice yet (katakana phrases, early on), Start is disabled with a short reason.

**Script and phrases.** Many useful phrases mix scripts: トイレ は どこ です か. Rule: Hiragana means everything in the item is hiragana; Katakana means everything is katakana; items that mix the two only come up with Both. The setup says so in a hint under Script when Phrases is chosen. (Almost all phrases are hiragana or mixed; katakana-only phrases are rare.)

**Spaces** only change phrases (and the words on the back, see below); single words have no spaces. The setting also applies wherever phrases are shown: the back of the card, the word table and the word card. It's a reading aid, so it's on by default, and turning it off is a way to practise reading as Japanese is written.

**Cards per round.**

- With a number: the round has that many *answers* (a word you miss and see again counts again). The top bar shows `7 / 15` and the progress bar fills.
- Unlimited: the top bar shows `7 answered` and there's no progress bar. The round goes on until you leave.
- Leaving (the × or Escape) after at least one answer shows the summary instead of dropping straight back to the overview. That matters most for unlimited, where leaving is the only way to end.
- With fewer unlocked words than the length, the round still runs the full length: words come back (see 3).

## 3. Spaced repetition for words

**Now: missed words barely come back sooner.** `practiceOrder` sorts by `seen × 0.5 + accuracy × 2 + random × 1.5`. A word you've never seen comes first. A word you missed gets a slightly lower score, but every time you see it, `seen` goes up and pushes it back. Within a round a missed word never comes back. There's no notion of "due", so a word you read easily yesterday is as likely to come up as one you missed.

**Proposal: an FSRS card per word**, the same scheduler as the kana.

- `WordProgress` gets an optional `card?: CardRecord`. `seen`, `correct` and `last` stay (the word card and the table use them); `correct` counts Hard, Good and Easy.
- Why on `WordProgress` and not as a new deck in `save.cards`: a new `DeckId` runs through the table, stats, mastery, daily limits and the optimiser, none of which are about words. On `WordProgress` it's contained.
- `merge.ts`: per word, keep the newer card (`newerCard`, as for kana), and the max of the counters, as now.
- `persistence.ts`: accept and sanitise `card` (same `isCardRecord` / `sanitizeCard`).
- The reading log entries get `grade` from now on. They have no `deck`, so the optimiser keeps skipping them (it only uses kana reviews): word reviews don't change the kana weights. The words use the same weights and desired retention as the kana.

**Which words a round shows, in order** (only words that match the setup):

1. **Missed in this round.** A word you answered Again comes back after 3–5 other words (sooner if there's nothing else), like a learning step. Only Again brings a word back in the round; Hard gets a short interval from FSRS.
2. **Due words**, most overdue first (lowest retrievability).
3. **New words** (unlocked, never practised), shortest first, then in list order. Mixed in: at most one new word for every two due ones while there are due words. No daily limit; unlocking already paces them.
4. **Not due yet**, lowest retrievability first, so a round never runs out. This is practising ahead; FSRS handles early reviews (they count for less).

Never the same word twice in a row. In 'Both', words and phrases, and the two scripts, mix in this one order.

This lives in `reading.ts` as a small `ReadingSession` (next word, answer, again-queue), unit-tested like `queue.ts`, replacing `practiceOrder`.

**Existing data.** Your reading answers so far are in the log (`mode: 'reading'`, `correct`, `t`). On load, for every word with progress but no card, replay its log entries in time order through FSRS: right as **Good** (3), wrong as **Again** (1). That gives each word the card it would have had. It's deterministic (ts-fsrs seeds its fuzz from the card and time), so two synced devices that migrate on their own get the same card, and the merge has nothing to resolve. A word whose entries were trimmed from the log (it keeps the last 50,000) but has `seen > 0` gets one Good or Again at `last`, depending on whether most answers were right. The log itself isn't rewritten: old entries without `grade` read as 3/1 where needed (as in Study's `recordPractice`).

No schema version bump: `card` is optional and the migration runs whenever it's missing.

## 4. Four answers

After the reading shows, the same grade buttons as in Study: **Again · Hard · Good · Easy**, each with its next interval (`previewIntervals`), keys **1–4**, Enter for Good. The labels (`grade.1`–`grade.4`), colours and sounds (`feedback(grade)`) are the same.

- **Self-check** (the default): the four buttons replace "Couldn't read it" and "Read it".
- **Typed:** after Check, the four buttons too, with a suggested grade highlighted and Enter accepting it, as in Study. Wrong suggests Again; right suggests Easy, Good or Hard by speed. Reading a word takes longer than a kana, so `suggestGrade` gets the time thresholds scaled by the number of kana. Typed answers already ignore spaces (`normalize`), so "toire wa doko desu ka" and "toirewadokodesuka" both count.
- **Summary:** "12 of 15 read" (Hard, Good and Easy count as read), plus the words you answered Again, with their reading, each opening the word card (like `MissedKana` in Study).
- **Undo** (Z, and a button), as in Study: the word's card, counters and log entry go back, and the word shows again.
- `reading.couldntRead` and `reading.readIt` go (English and Dutch).

## 5. The word list

The overview now shows every unlocked word as a chip (`Reading.svelte`, "Unlocked words"), with only the kana visible; with 1,000 words that's a wall. It becomes a table.

**Columns**

| Column | Content |
|---|---|
| Word | The kana, in the app's font (phrases with or without spaces, per the setting). |
| Romaji | In the romanisation chosen in Settings. |
| Meaning | In the interface language. |
| Listen | ▶ female, ▶ male (`VoiceButtons`, the preferred voice first). |
| How you're doing | A mastery dot in the table's colours (new, learning, young, mature), "4 / 5 right", and when it's due ("due", "in 3 d"). Locked words: a lock and the kana they still need (in red, as in "Next to unlock" now). |

Clicking a row (not the play buttons) opens the word card, as the chips do now.

On a phone the table doesn't fit in five columns: each row becomes two lines, the word and its mastery dot on the first, romaji · meaning and the play buttons on the second. Same data, no horizontal scrolling.

**Sections, collapsible.** Hiragana words · Katakana words · Phrases, each with its count and progress ("Hiragana words · 214 / 380 unlocked · 52 mature"). Click the heading to open or close it. Open/closed is remembered (setting `wordListOpen`, synced). By default only the first section is open. A closed section doesn't render its rows, so a closed table costs nothing, which matters with 1,000 rows (the kana table had to be made 50× faster; the same care here).

**Sorting.** Click a column heading to sort by it; click again to reverse. One sort for all sections, remembered (`wordListSort`):

- **Word:** あいうえお order (gojūon, the Japanese "alphabetical" order), via `Intl.Collator('ja')`.
- **Romaji:** A–Z.
- **Meaning:** A–Z in the interface language.
- **How you're doing:** weakest first: locked last, then new, then by retrievability (how likely you are to read it right now), lowest first. Reversed: best first.
- **Due:** soonest first.
- Default: list order (easiest first, as now), which is also the "unlocked next" order.

**Filters** above the table: a search box (kana, romaji or meaning; "eki", "えき" or "station" all find えき), and Unlocked only (on by default, remembered as `wordListUnlocked`; off shows locked words too, dimmed). With a search, sections with matches open on their own.

"Next to unlock" stays as it is above the table; it's a short, useful list.

## 6. 500 new words and phrases for travelling

500 new items (split confirmed: 180 · 180 · 140), chosen for what you read, hear and say as a visitor: signs, menus, stations, shops, hotels. Roughly:

| Kind | Count | Examples |
|---|---|---|
| Hiragana words | 180 | いりぐち (entrance), でぐち (exit), きっぷ (ticket), おすすめ (recommendation), おかいけい (the bill), おてあらい (toilet), じんじゃ (shrine), おてら (temple), おんせん (hot spring), ゆ (hot water, on onsen curtains), きんえん (no smoking), みぎ / ひだり (right / left) |
| Katakana words | 180 | ホテル, チェックイン, コンビニ, タクシー, メニュー, ラーメン, Wi-Fi as ワイファイ, クレジットカード, トイレ, ロッカー, エスカレーター, パスポート |
| Phrases (2–4 words) | 140 | すみません, これ を ください, トイレ は どこ です か, いくら です か, カード で おねがいします, えいご の メニュー は ありますか, おかいけい おねがいします, だいじょうぶ です |

**Themes.** Greetings and politeness; getting around (train, bus, station, platform, transfer, directions); eating out (ordering, dishes, drinks, allergies, the bill); shopping and money (prices, tax free, card or cash, sizes); the hotel (check-in, key, breakfast, towel); sightseeing (temple, shrine, castle, garden, onsen, tickets, opening times); numbers, time and days (in kana: さんじ, なんじ, あした); signs and warnings (おす / ひく: push / pull, とまれ: stop, きけん: danger, ちゅうい: caution); emergencies and health (たすけて, びょういん, くすり, けいさつ).

**Choosing them.**

- Common and concrete over rare; what you'd actually need on a trip.
- No duplicates with the current 507 (a test checks this already).
- Written in kana as the app does, although many are usually written in kanji (駅, 切符). Kanji is a separate, bigger feature for later; for now the meaning doesn't mention it either.
- Phrases are short (2–4 words), polite (です / ます), and in the form you'd actually use, with the particles は, へ and を read wa, e and o (the "particles" rule).
- Hepburn romaji with macrons for long vowels, like the existing words; phrases with spaces between words ("toire wa doko desu ka").

**Data.** The entries go at the end of `ENTRIES` (a word's index names its recording, so the order of the existing ones stays). Phrases are written with spaces between the words: `['トイレ は どこ です か', 'toire wa doko desu ka', 'where is the toilet?']`. From that, `build` makes:

- `kana`: without spaces (`トイレはどこですか`), the key for progress, audio and matching, as for words now.
- `parts`: the words (`['トイレ', 'は', 'どこ', 'です', 'か']`), for drawing with or without spaces.
- `kind`: `'phrase'` when there's more than one part, else `'word'`.
- `script`: `'hiragana'`, `'katakana'` or, new, `'mixed'`.
- Rules from the spelling, word by word (each part in its own script, so the hiragana-only rules don't fire on the katakana words in a mixed phrase). A part that's just は, へ or を is a particle: that adds the particles rule on its own.
- Accepted typed answers from the romaji (with and without macrons, Hepburn and Kunrei), not from the kana, so は as a particle is "wa".

Unlocking goes kana by kana in each kana's own script, so トイレ は どこ です か needs ト, イ and レ in katakana and the rest in hiragana. Today `wordKana` and `knownLevel` assume one script per word; they change to take the script from each character (`scriptOf`).

The word list tests change with it: "every character is in the word's script" becomes "every character is in the script of its part", and a new test checks that phrases have 2–4 parts and their romaji has as many words.

**Dutch.** Every new word and phrase gets a Dutch meaning in `nl/words.ts` (the coverage test requires it).

**Audio.** Every item gets a recording in both voices, made with VOICEVOX as now (`npx tsx scripts/generate-audio.ts --new-words`, with the engine in Docker): about 1,000 new files, around 10 MB. VOICEVOX reads text the way it would read Japanese text, and with kana only it can get particles wrong (the rule examples already use kanji for this: `私は`, `学校へ`). So:

- An optional `say` for an entry: the text VOICEVOX gets instead of the kana (with kanji where that gives the right reading: `トイレはどこですか`, `英語のメニューはありますか`).
- `--preview` (the existing voice preview page) for the new items, and I listen to every phrase and the words most likely to be misread before committing them. Items that VOICEVOX can't get right are changed or left out.
- Word and phrase audio stays out of the offline download, as now: only the kana are precached (`vite.config.ts`, `globPatterns: 'audio/*/*.mp3'` doesn't match `audio/*/words/`). A word's recording downloads the first time it plays and is kept after that (the `kana-word-audio` runtime cache). That cache keeps at most 1,000 files; with about 1,000 words in two voices, plus the rule examples, it needs about 2,100, so raise `maxEntries` to 3,000 so recordings you've heard aren't dropped. The precache budget (`budget.spec.ts`) doesn't change.

## Files

- `src/views/Reading.svelte`: setup panel, session, grade buttons, undo, summary, sizes, word table.
- `src/components/WordList.svelte` (new): the table, sections, sorting, search.
- `src/components/WordText.svelte` (new): a word or phrase, with or without spaces, wrapping between words, sized to the card. Used on the card, in the table and in the word card.
- `src/components/PaperCard.svelte`: container on `.content`.
- `src/components/WordCard.svelte`: size, phrases, mastery and due date.
- `src/lib/data/words.ts`: the new entries; `parts`, `kind`, `say`, `'mixed'`; rules per part; accepted answers from the romaji.
- `src/lib/data/nl/words.ts`: Dutch meanings.
- `src/lib/study/reading.ts`: `wordSize`, `ReadingSession`, `migrateWordCards`, unlocking per character's script, sort keys for the table; `practiceOrder` goes.
- `src/lib/study/actions.ts`: `recordWord(save, word, grade, now)` grades the card and updates the counters.
- `src/lib/study/answer.ts`: `suggestGrade` with a length.
- `src/lib/study/undo.ts`: undo for a word.
- `src/lib/storage/schema.ts`: `WordProgress.card`; `readingScript`, `readingKind`, `readingSpaces`, `readingCount`, `wordListSort`, `wordListOpen`, `wordListUnlocked`.
- `src/lib/storage/persistence.ts`, `merge.ts`: the card; the migration on load.
- `scripts/generate-audio.ts`: `say`.
- `vite.config.ts`: word audio cache `maxEntries` 1,000 → 3,000.
- `public/audio/{female,male}/words/`: the new recordings.
- `src/lib/i18n/{en,nl}/practice.ts`: new and removed strings.
- Tests: `reading.test.ts` (word list, phrases, unlocking, session order, again-queue, migration, size, sorting), `merge.test.ts`, `persistence.test.ts`, `answer.test.ts`, `undo.test.ts`, `i18n-coverage.test.ts`, `tests/e2e/words.spec.ts` (setup fields, unlimited, four buttons, undo, table sort/collapse/search, long word and phrase on a phone), `budget.spec.ts`.

## Order of work

1. Long words on the card (on its own, quick to ship).
2. Cards for words + migration + merge/persistence (no UI change yet; tests).
3. Four grade buttons, undo, summary.
4. `ReadingSession` (order, again-queue) replacing `practiceOrder`.
5. Setup panel: script, length, unlimited; due/new counts.
6. The word table.
7. Phrases in the data model (`parts`, `kind`, `'mixed'`, per-character unlocking), `WordText`, spaces setting, Words/Phrases choice. Tested with a handful of phrases first.
8. The 500 new words and phrases, in batches by theme: entries, Dutch meanings, recordings (listened to), one commit per batch.
