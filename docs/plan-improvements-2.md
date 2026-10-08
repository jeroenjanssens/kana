# Improvements, round 2: plan

> **Status (2026-10-08): implemented.** Where the build differs from this plan:
> - **Sprint (6):** instead of waiting for Space after "n", answers are judged as you type. An answer is correct as soon as it matches an accepted spelling, and wrong as soon as it can't become one, so no Enter is needed.
> - **FSRS optimizer (8):** `fsrs-browser` is built with threads, but runs single-threaded in a Web Worker without cross-origin isolation (tested in Chromium). If a browser can't run it, Settings says so.
> - **Koto (10a):** the real-recording default worked. Three isolated notes were cut from the recording, and they happen to form a root, fifth and octave (310 / 459 / 630 Hz).
> - **Mobile performance (10b):** Lighthouse mobile went from 77 to 97. The biggest win was loading the large card font after the first paint, followed by splitting `ts-fsrs` out of the first load.

This round covers every suggestion from the "what else?" list: eight learning and habit features, four polish items, and the three known compromises.

As before:
- Each item gives the change, how it's tested, and any design decision, with a **default** (what I'll build) and an **alternative**.
- The guiding rule is to reuse what's already there and keep the domain logic in plain, unit-tested TypeScript under `src/lib/`.
- Svelte components stay thin.

---

## 1. An introduction for each new kana (with memory hints)

**Today:** a new card is simply shown, and you're expected to know it.

**Change:**
- In SRS sessions, the first time a new kana comes up, an **introduction card** appears instead of the quiz. It shows:
  - the kana, large, on paper
  - its sound, played automatically
  - a **stroke-order animation** that plays once
  - a **memory hint**, written in house so there are no copyright issues; for example, for **ぬ**: "noodles (nu-dles) wrapped around chopsticks, with a loop at the end"
  - for dakuten and handakuten kana, a hint about the base kana and the marks
  - for yōon, how they're built from a base kana plus a small ゃ, ゅ or ょ
  - for combined cards, both scripts side by side, each with its own hint
- Pressing **"Got it"** (or Space) schedules the card in learning, due in 1 minute, so it's quizzed shortly afterwards. Nothing is graded as wrong.
- **Data:** `src/lib/data/mnemonics.ts` holds `{ [kanaId]: { hiragana?: string; katakana?: string } }` for the 46 basic kana in each script. Dakuten and yōon hints are generated from rules.
- **Logic:** `introduce(save, deck, id)` in `actions.ts` creates the learning card and logs a review entry with `mode: 'intro'`. Stats exclude `'intro'` entries from accuracy and the confusion stats, but they still count as activity in the heatmap.
- **Setting:** Settings → Study → "Introduce new kana" (on).
- The hints also appear on the back of the card, in the table details, and in the leech helper (item 5).

**Decision 1: what happens after "Got it"**
- *Default:* **The card goes into learning and comes back within a minute as a normal quiz.** This is how Anki's learning steps work.
- *Alternative:* **Quiz it right away**, straight after the introduction. That's faster, but you're tested on something you saw a second ago.

**Tests:**
- Unit tests for `introduce`: it creates a learning card due in a minute, counts as a new card for today, and its log entry is excluded from accuracy.
- Unit test that every basic kana has a hiragana and a katakana hint.
- Unit tests for the rule-based hints (が mentions か, きゃ mentions き and ゃ).
- e2e test: the first new card shows the introduction, "Got it" moves on, the card comes back as a quiz, and turning the setting off skips it.

---

## 2. Writing practice, with stroke checking

**Change:**
- A new practice mode, **Writing**, with its own SRS decks: `write-hiragana` and `write-katakana`.
- You see the **romaji** (and can hear the sound), then draw the kana on a paper canvas with finger, pen or mouse. The canvas has the same 109 × 109 grid and ink look as the stroke-order animation.
- **Checking** (all in `src/lib/study/handwriting.ts`, pure and unit-tested):
  1. Parse the KanjiVG paths of the expected kana. This is a small SVG-path parser for the commands KanjiVG uses (`M m C c S s L l Z`), which sample into points.
  2. Normalise your strokes and the reference strokes to the same box, keeping the aspect ratio.
  3. Compare them **stroke by stroke**:
     - Is the **count** right?
     - Is the **order** right? Each of your strokes is matched to the closest reference stroke.
     - Is the **direction** right? Start and end points are compared.
     - Is the **shape** close enough? Average distance after resampling both strokes to 32 points.
  4. Return a verdict per stroke ("stroke 2 goes the wrong way", "stroke 3 is missing") and an overall result.
- **Feedback:**
  - The correct strokes are overlaid in red, numbered.
  - Wrongly drawn strokes are highlighted.
  - "Show me" replays the stroke-order animation.
- **Grading:** suggested from the result (all correct and quick → Easy; correct → Good; small issues → Hard; wrong → Again). You can override it, as with typed answers.
- **Yōon** are written as two characters: the base kana, then the small one in the right half of the canvas.
- Extended katakana are not included.

**Decision 2: how strict the check is**
- *Default:* **Count, order and direction must be right; shape only needs to be roughly right.** Writing with a finger is imprecise, and order and direction are what build good habits.
- *Alternative:* **A strict shape check as well.** Small proportions matter more, but there are more false "wrong" results on phones.

**Tests:**
- Parser unit tests with known KanjiVG paths: start and end points, sample counts, relative vs absolute commands.
- Matcher unit tests using the **reference strokes themselves as "perfect drawings"** for every kana. They must all be accepted, which is about 200 cases.
- Matcher unit tests with deliberately wrong drawings that must be rejected, with the right reason: a reversed stroke, swapped strokes, a missing stroke, an extra stroke, and a different kana (シ drawn for ツ).
- Small random jitter must still be accepted.
- e2e test: draw あ with Playwright's mouse along the reference strokes and get "Correct"; draw stroke 1 backwards and get "wrong direction".

---

## 3. Romaji → kana cards

**Change:** this item is covered by the Writing decks from item 2: you see "shi" and write し.
- For people who can't or don't want to draw, the Writing session has an **answer style** switch: **Draw** or **Choose**. Choose shows 6 kana, with look-alikes picked deliberately using the existing `chooseOptions`.
- Both styles grade the same `write-*` decks.

**Decision 3: one deck or two for producing kana**
- *Default:* **One production deck per script.** Draw or Choose is just how you answer.
- *Alternative:* **Separate "choose" and "write" decks.** That separates the two skills, but means more decks to keep track of.

**Tests:**
- Unit tests that the deck lists exclude extended katakana.
- e2e test of the Choose style: pick the right kana, then the right deck is graded.

---

## 4. Undo the last grade

**Change:**
- In SRS sessions, **Undo** (a button, or `U` / `Ctrl+Z` / `⌘Z`) restores the previous card exactly as it was and shows it again.
- It works several steps back within the session.
- **Implementation:** before grading, `recordReview` already knows the card's previous state. A small `UndoStack` in `src/lib/study/undo.ts` stores, per step:
  - the deck and card id
  - the card record before the answer (or "didn't exist")
  - the log length
  - the daily new-card count
  - whether the card was celebrated as mastered
  - the `Session` snapshot (`Session` gets `snapshot()` and `restore()`)
- Undo restores all of these, so it's an exact inverse.
- Listening and writing sessions get Undo too, since they use the same `Session`.

**Decision 4: how far back you can undo**
- *Default:* **Back to the start of the current session.**
- *Alternative:* **Only the very last answer.**

**Tests:**
- Unit tests: grade then undo gives back exactly the same save file (deep-equal) and session state; several undos in a row; undoing a newly introduced card; undoing a card that became mature (its celebration is removed too).
- e2e test: grade Easy, press U, and the same card is back with "10 left".

---

## 5. Troublesome cards ("leeches")

**Change:**
- A card becomes a **leech** when its lapse count reaches the threshold. This is derived from the card's existing `lapses` field, so no new data is stored.
- When it happens:
  - a toast says "You keep forgetting シ — let's look at it closely"
  - the card back shows a **"Tricky" chip** with the memory hint and a link to the matching confusable-pairs drill, if there is one
- **Stats** lists your leeches, with a "Drill these" button that starts an in-order session (introduction view included).
- **Settings:** a leech threshold (default 6).

**Decision 5: what happens to a leech**
- *Default:* **Flag it and help: show the hint and offer a drill.** It keeps being scheduled as normal.
- *Alternative:* **Suspend it** until you've drilled it, as Anki does. That's more effective at breaking the cycle, but cards then "disappear" from the schedule.

**Tests:**
- Unit tests for `isLeech` and for detecting the moment a card becomes one.
- e2e test with a seeded card at 5 lapses: Again triggers the toast and the "Tricky" chip.

---

## 6. One-minute sprint

**Change:**
- A new practice mode, **Sprint**: 60 seconds, read as many kana as you can.
- **Kana pool:** the kana you've already studied in that script, with at least 10. If you haven't studied enough, all basic kana are used.
- **Answering:** type the romaji. The answer is accepted **as soon as it's unambiguous**: "ka" advances immediately, but "n" waits, because "na", "ni" and so on are also possible, until you type more or press Space or Enter.
  - On touch devices, 4 multiple-choice buttons replace typing.
- **Scoring:** a correct answer scores; a wrong one shows the correct answer briefly, and you lose a little time. The result screen shows your score and your best per script, with a hanko seal for a new record.
- **Data:** `save.sprints: Record<'hiragana' | 'katakana', { best: number; at: number }[]>`, keeping the last 50. It's added to the schema with a default, so no migration is needed. Answers are logged with `mode: 'sprint'`, so they feed the stats and the confusion pairs.

**Decision 6: how a sprint ends**
- *Default:* **A fixed 60-second timer**, with a 2-second penalty for a wrong answer.
- *Alternative:* **Survival**: 3 mistakes and you're out.

**Tests:**
- Unit tests for the "unambiguous answer" check (ka, n vs na, shi vs si), scoring, the penalty, and record keeping.
- e2e test with Playwright's clock: type answers, let the clock run out, and check the score and best are saved.

---

## 7. Daily goal and a reminder

**Change:**
- **Daily goal:** a number of answers per day (default 30). It counts answers from every mode in today's log.
  - Home shows a **progress ring** around the streak badge.
  - Reaching the goal plays the milestone sound and stamps a small seal for that day on the Stats heatmap.
- **Reminder:** a browser app can't reliably schedule notifications without a server.
  - The Notification Triggers API was abandoned.
  - Periodic Background Sync only works in Chrome on Android, for installed apps, and even then only at the browser's discretion.
  - So the default reminder is a **calendar event**: Settings → "Add a daily reminder to your calendar" downloads an `.ics` file. It holds a daily recurring event at the time you choose, with a link to the app, and works with every calendar app on every device.

**Decision 7: how the reminder works**
- *Default:* **A calendar (.ics) reminder.** Reliable everywhere, and you can change or remove it in your calendar.
- *Alternative:* **A browser notification via Periodic Background Sync**, offered in addition where it's supported (installed app on Android Chrome). Elsewhere it would silently do nothing.

**Tests:**
- Unit tests for daily-goal progress and the `.ics` generator: valid VCALENDAR, RRULE daily, the chosen local time, CRLF line endings and line folding.
- e2e test: the goal ring fills after some answers, and the `.ics` file downloads.

---

## 8. Personalised review intervals (FSRS optimizer)

**Change:**
- With **enough reviews** (FSRS needs about 1,000 for a good fit; the button is enabled from 400), Settings → Study offers **"Optimise my intervals"**.
- It runs the official optimizer (`fsrs-browser`, a WebAssembly build of `fsrs-rs`, BSD-3) in a **Web Worker**, so the page stays responsive. It's trained on your own review log.
- The result is a set of FSRS weights, stored as `settings.fsrsWeights`, and the scheduler uses them from then on. The settings show when it last ran and on how many reviews. "Reset to default" undoes it.
- **Desired retention** is also exposed: 0.80–0.95, default 0.90. It's the usual FSRS knob: higher means more reviews and better recall.
- **Lazy loading:** the optimizer (≈400 KB of WebAssembly) only loads when you press the button.

**Decision 8: optimise automatically or on request**
- *Default:* **On request**, with a hint in Settings once you have enough reviews.
- *Alternative:* **Automatically**, once a month in the background.

**Tests:**
- Unit tests that the review log is converted to the optimizer's input correctly (grouped per card, chronological, intervals in days).
- Unit tests that the scheduler uses custom weights and retention.
- Integration test: run the optimizer in Node on a synthetic log of about 1,500 reviews. It must return 19 or 21 finite weights that differ from the defaults. (`fsrs-browser` also runs in Node; if not, the test uses the same WebAssembly module directly.)

**Risk:** if `fsrs-browser` can't run in a worker under Vite, I'll fall back to exposing only desired retention, and tell you.

---

## 9. Polish

### 9a. Notes on dakuten and yōon
- The first time a dakuten, handakuten or yōon kana is **introduced** (item 1), the introduction includes a short note, using the same component and the same "seen notes" mechanism as reading practice:
  - "゛ (dakuten) makes a sound voiced: か ka → が ga"
  - "゜ (handakuten) turns h into p: は ha → ぱ pa"
  - "a small ゃ/ゅ/ょ blends with the kana before it: き + ゃ → きゃ kya"
- **Test:** each note shows once, and the second dakuten kana doesn't show it again.

### 9b. Haptic feedback
- A light vibration on grading, through `navigator.vibrate`: a short tap for a correct answer and a double tap for Again.
- It's in a setting, on by default, and goes through one helper, `haptic(kind)`, which is skipped when reduced motion is on.
- **Note:** this works on Android; iOS Safari doesn't support vibration, so nothing happens there.
- **Test:** unit test of `haptic` with a stubbed `navigator.vibrate`.

### 9c. Photos that match the season
- Each photo gets a `season` tag (`spring | summer | autumn | winter | any`) in `scripts/photos.json` and `credits.json`, assigned by hand: cherry blossoms are spring, maples are autumn, snowy Fuji is winter, and so on.
- A new setting, **"Match the season"** (on), limits rotation to the current season's photos plus the season-neutral ones.
- The seasons follow Japan: spring is March–May, summer June–August, autumn September–November, winter December–February.
- **Tests:** unit tests for `seasonOf(date)` and that rotation stays within the season; at least 4 photos per season.

### 9d. Dutch interface
- A small, type-safe translation layer: `src/lib/i18n/` with `en.ts` (the source of truth) and `nl.ts`, plus `t(key, params)`.
- The translation dictionaries are typed, so a missing Dutch key is a compile error.
- **Language setting:** System, English or Nederlands. "System" follows `navigator.language`.
- **What's translated:** all interface text. Not translated: kana data and romaji; the English word meanings in reading practice (the 392 words get Dutch meanings as a separate `meaningNl` field); confusable hints; and memory hints, all of which get Dutch versions too.

**Decision 9: how much to translate**
- *Default:* **All of it**: the interface plus words, hints and memory hints.
- *Alternative:* **Interface only**, with English learning content.

**Tests:**
- Unit test that every English key exists in Dutch and the placeholders match.
- A scan test that no user-visible string literals remain in `.svelte` files (a heuristic: text between tags that contains letters and isn't wrapped in `t()`).
- e2e test: switching to Nederlands changes the nav to "Leren · Tabel · Oefenen · Statistieken".

---

## 10. Known compromises

### 10a. A real koto sound
- Wikimedia Commons has a recording of a 13-string koto (*Koto performance.ogg* by Torsodog, **CC BY 3.0**).
- I'll cut **three clean single notes** from it (low, middle and high) and use them directly, without pitch-shifting, as the Hard, Good and Easy sounds, with a credit.
- The cutting is scripted in `process-sfx.ts`, with the onsets found automatically and checked by ear.

**Decision 10: where the koto sound comes from**
- *Default:* **Real koto notes from that recording.**
- *Alternative:* **Synthesise a koto-like pluck** (Karplus-Strong with a body resonance) at exact pitches. It's fully CC0, but less authentic.

If the recording has no clean isolated notes, I'll use the alternative and tell you.

### 10b. Mobile performance (79 → ≥ 90)
- Split `scheduler.ts` so the Home page doesn't load `ts-fsrs`: queue building doesn't need it, only grading does.
- Preload the default card font and the heading font with `<link rel="preload">` hints in the build.
- Inline the small critical CSS for the splash screen and the shell.
- Defer the service-worker registration until after load.
- Measure with Lighthouse after each step, and keep only what helps.
- **Test:** a size budget test that fails if the JavaScript loaded on first visit exceeds 120 KB gzipped.

### 10c. Sync between devices
- Optional, off by default: **Settings → Sync → GitHub Gist**.
  - You paste a GitHub token that can only create gists. The app stores your progress as a *secret* gist and syncs on start, after each session, and on demand.
  - The token is kept only in this browser.
- **Merging** (in `src/lib/storage/merge.ts`, pure and tested):
  - Each card takes the version with the **latest `last_review`**.
  - The logs are unioned, de-duplicated on (time, mode, deck, id).
  - Word progress takes the higher counts.
  - Settings are last-writer-wins, with an `updatedAt` timestamp.

  So studying on two devices offline and syncing later loses nothing.

**Decision 11: how syncing works**
- *Default:* **GitHub Gist** (a free and private gist; no server for me to run). It suits you, since you're on GitHub.
- *Alternative:* **A file in a synced folder** (iCloud Drive, Dropbox) via the File System Access API, which works only in Chromium browsers. Or the **existing export/import**, made easier with a "copy to clipboard" option.

**Tests:**
- Unit tests for `merge`: commutative (merging a with b gives the same result as b with a), idempotent, no lost reviews, newest card wins, and the conflict scenarios.
- The Gist client is tested with a mocked `fetch`: create, update, conflict, a bad token, and offline.

---

## Order of work

Each step ends with lint, type-check, unit and e2e tests passing, then a commit and push.

1. **Undo (4)** and **leeches (5)**: small, and they touch the core.
2. **Introduction + memory hints (1)** and **dakuten/yōon notes (9a)**.
3. **Writing practice (2)** with **romaji → kana (3)**.
4. **Sprint (6)**.
5. **Daily goal + calendar reminder (7)**.
6. **FSRS optimizer + desired retention (8)**.
7. **Koto (10a)**, **haptics (9b)**, **seasonal photos (9c)**.
8. **Mobile performance (10b)**.
9. **Sync (10c)**.
10. **Dutch (9d)**, last, so every new string from the steps above gets translated in one pass.

## Summary of decisions (defaults used unless you say otherwise)

| | Decision | Default | Alternative |
|---|---|---|---|
| 1 | After an introduction | Learning card, quizzed within a minute | Quiz right away |
| 2 | Writing check | Count, order and direction strict; shape lenient | Strict shape as well |
| 3 | Producing kana | One deck per script; Draw or Choose | Separate decks |
| 4 | Undo depth | Whole session | Last answer only |
| 5 | Leeches | Flag + hint + drill | Suspend |
| 6 | Sprint | 60 s timer, 2 s penalty | Three strikes |
| 7 | Reminder | Calendar (.ics) | Browser notification where supported |
| 8 | FSRS optimizer | On request (+ desired retention) | Automatic monthly |
| 9 | Dutch | Interface and learning content | Interface only |
| 10 | Koto | Real notes from a CC BY recording | Synthesised pluck |
| 11 | Sync | GitHub Gist (optional) | Synced folder or easier export |
