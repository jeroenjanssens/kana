# Sprint and Race: plan

> **Status (2026-10-21): plan.**

Three changes to Practice:

1. **Sprint**: drop "one-minute" from the name, give it a stopwatch icon, and let you choose the length and the script.
2. **Race**: a new practice type where you go through a chosen set of kana, each exactly once, as fast as you can.
3. **Speaking (test)**: removed.

Each one gets its own commit, in this order.

Sprint and Race share a choice of script: **Hiragana · Katakana · Both**. With Both, every question still shows one character, either hiragana or katakana. Each answer is logged under its own script (`deck: 'hiragana'` or `'katakana'`), so stats stay correct per script.

---

## Shared: questions in a script

New module `src/lib/study/scripts.ts`:

- `ScriptChoice = 'hiragana' | 'katakana' | 'both'`, and `SCRIPT_CHOICES`.
- `scriptsOf(choice)`: `['hiragana']`, `['katakana']` or `['hiragana', 'katakana']`.
- `Question = { kana: Kana; script: Script }`: what is asked, and in which script it's shown.
- `questionKey(q)`: `hiragana:ka`, used to compare questions and as an id for records.

A segmented control for the choice (`ScriptPicker.svelte`), used by both pages and styled with the existing `.segmented`.

---

## 1. Sprint

**Name and icon**
- English: "Sprint". Dutch: "Sprint". On the Practice card and on the Sprint page.
- Descriptions no longer mention 60 seconds: "Read as many kana as you can before the time runs out, and beat your best."
- A new `stopwatch` icon in `Icon.svelte`, in the same line style as the others. It replaces "60" on the Practice card.

**Setup** (`#/sprint`)
- One screen instead of the two deck cards:
  - Script: Hiragana · Katakana · Both
  - Length: 1 · 2 · 3 · 5 min
  - "Best: N" for this script and length
  - Start (Enter)
- New settings: `sprintScript` (default `hiragana`) and `sprintMinutes` (default 1). They sync like other settings, and "Again" reuses them. A `sprintMinutes` that isn't 1, 2, 3 or 5 falls back to 1.
- The old `#/sprint/hiragana` and `#/sprint/katakana` links open the setup with that script chosen.

**The pool**
- Per script, as today: the kana you've studied in that script (in its own deck or the combined deck), or the basic kana if that's fewer than 10.
- With Both: the union of both pools.
- `nextQuestion` never asks the same question (kana and script) twice in a row.

**During the sprint**
- The time shows as `m:ss` (`4:32`). The bar runs over the chosen length.
- A wrong answer still costs 2 seconds, for every length.
- On phones, the four buttons are built from the kana in the pool. Romaji is the same in both scripts, so that doesn't change.

**Records**
- Each saved sprint gets a `minutes` field. Sprints without it are 1-minute sprints, so existing best scores stay.
- `save.sprints` gets a third key, `both`.
- `bestSprint(save, choice, minutes)` and `recordSprint(save, choice, minutes, score)`.
- The last 50 sprints are kept per script choice *per length*, so a 5-minute record is never pushed out by many 1-minute sprints.
- Merging synced data includes the length in the key.
- Loading keeps `minutes` when it's a number.
- An older version of the app on another device ignores `minutes` and `both`. It will count a 5-minute score as a 1-minute record until it's updated. Accepted.

**Result screen**
- "{score} kana in {n} minutes" (1 minute: "in one minute").
- For 2, 3 and 5 minutes: "{rate} per minute".
- Best score and the "New record" seal compare with the same script and length.

**Tests**
- Unit: best and record per length and choice, old entries count as 1 minute, 50 kept per length, Both pool, loading and merging with `minutes`.
- e2e: update the existing sprint tests to the new setup. Add one that chooses 2 minutes and Both, and checks the clock starts at `2:00` and that answers are logged per script.

---

## 2. Race

**Practice card**: "Race", with a checkered-flag icon (`flag`). "Go through a set of kana, each once, as fast as you can."

**Setup** (`#/race`)
- Script: Hiragana · Katakana · Both
- Which kana: Seen so far · Mastered · All · Choose rows
  - **Seen so far**: kana you've studied at least once in that script (its own deck or the combined deck).
  - **Mastered**: kana that are at least "young" in that script's deck or the combined deck.
  - **All**: every kana in the groups enabled in Settings.
  - **Choose rows**: the row chips from Study in order, with Select all and Clear. With Both, a chip shows both scripts (か カ) and a row counts in both. Extended rows only exist in katakana.
- Random order (switch)
- Start button with the count: "Race 92 kana". Disabled when the set is empty, with a hint (for example "You haven't mastered any kana yet").
- The whole setup is remembered in settings: `raceScript`, `raceKana`, `raceRows`, `raceShuffle`.

**Order**
- Without random order: table order, all hiragana first, then all katakana.
- With random order: fully shuffled, scripts mixed.

**During the race**
- Each question exactly once. Type the romaji (no Enter needed, same judging as Sprint), or tap one of four buttons on a phone.
- A clock counts up (`m:ss`), with progress "12 / 46" and a bar.
- A wrong answer shows the right romaji for 0.8 s, adds 2 seconds to your time, and moves on.
- Every answer is logged as practice: `mode: 'race'`, with its script as `deck`.
- Escape or the close button goes back to the setup.

**Result screen**
- Finish time (including penalties), mistakes, and the average time per kana.
- Best time for this exact set, and a "New record" seal and sound when you beat it.
- The missed kana list (as in Sprint), plus "Race the missed ones", which starts a race with just those questions.
- "Again" (Enter) and "Practice".

**Records**
- `save.races: Record<string, { ms: number; mistakes: number; at: number }>`: the best time per set.
- The key is a short hash of the sorted question keys plus their count, so the same set always has the same key, whatever the order or how it was chosen.
- Merging keeps the faster time per key. Loading drops anything malformed. Reset clears it.

**Tests**
- Unit (`race.ts`): which questions each choice gives (seen, mastered, all, rows; per script and Both), order with and without shuffle, set key stable across order, best time and record, merge and load.
- e2e: a short race of one row typed through with one mistake; result, missed list, "Race the missed ones", and the saved best time. A phone version with buttons.

---

## 3. Remove Speaking (test)

- Delete `src/views/Speech.svelte`, `src/lib/audio/speech.ts`, `tests/unit/speech.test.ts` and `tests/e2e/speech.spec.ts`.
- Remove the route, the Practice card, the Header match, and the `speech.*` and `practice.speech*` texts in both languages.
- Keep record & compare in the kana details (`RecordCompare.svelte`, `recorder.ts`, `record.*` texts).
- `#/speech` shows the not-found page, like any other unknown address.
- Update the status note in `docs/plan-kana-speech-model.md`.
