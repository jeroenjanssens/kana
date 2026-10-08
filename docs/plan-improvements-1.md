# Improvements, round 1: plan

This plan covers the ten issues and requests from your feedback. For each one it gives the cause (where there is a bug), the change, how it will be tested, and any open design decision, with a **default** and an **alternative**.

Guiding rule: reuse what's already there (settings, the audio engine, the washi generator, the photo list) and avoid new abstractions unless they remove code elsewhere.

---

## 1. Scrollbar jumps between screens

**Cause:** pages that are taller than the window get a scrollbar and shorter pages don't. When the scrollbar appears or disappears, the content width changes and the layout shifts sideways.

**Change:** add one CSS rule in `src/styles/app.css`:
```css
html { overflow-y: scroll; }
```
The vertical scrollbar is then **always shown**, also on pages that don't scroll, so the content width is the same on every page and nothing shifts.
- On macOS with "Show scroll bars: when scrolling" (the default), and on phones, scrollbars are overlays, so you won't see a difference there.
- To keep it in style, the scrollbar gets the paper colours: `scrollbar-color: var(--paper-3) transparent`. In dark mode, too.

**Decision A ✅:** always show the scrollbar (decided).

**Test:** an e2e test that compares `main`'s width on a short page (Home) and a long page (Table) at the same viewport size. The widths must be equal. A second check asserts that `overflow-y` on `html` is `scroll`.

---

## 2. Sound reflects your answer, not your streak

The pitch is determined **only by your answer**, not by your streak or anything else.

**Change:**
- Remove the streak melody: `streakSemitones` and the `streak` counters in Study, Listen, Drills and Reading.
- Add one function to `src/lib/audio/engine.ts`, `gradeSound(grade)`, which maps a grade to a sound and pitch:

| Your answer | Sound |
|---|---|
| **Again** (1), or a wrong answer | Muted wooden *tock*, no note |
| **Hard** (2) | Koto pluck, **low** note (root + 12 semitones) |
| **Good** (3) | Koto pluck, **middle** note (root + 17) |
| **Easy** (4) | Koto pluck, **high** note (root + 24, one octave above Hard) |

- **When there's no grade button:**
  - **Listening and typed answers** suggest a grade from correctness and speed (fast and correct → Easy, slower → Good, very slow → Hard), and the note follows that grade. So a quick correct answer sounds high and a hesitant one sounds lower.
  - **Drills and reading practice** are only right or wrong: correct plays the middle note (Good), wrong plays the tock.
- **Typed answers in SRS:** the sound plays when the grade is **applied**, not when the answer is checked. So if you override the suggested grade with 1–4, you hear the note for the grade you actually chose.
- Remove the random pitch variation from the koto pluck so each grade always sounds the same. The other effects (paper, wood) keep their small variation.

**Decision B ✅:** a single note per grade, from low (Hard) to high (Easy) (decided).

**Tests:**
- Unit test that `gradeSound` returns the expected sound and pitch for each grade, and that the pitch rises from Hard to Good to Easy.
- Engine test (with the fake audio context) that the koto plays at exactly the rate for its grade, with no random variation.
- Update the existing streak tests. The playback-rate assertion for the streak goes away.
- e2e test that grading 2 and then 4 plays two different rates. The engine records its last playback in a debug hook that's only active in tests.

---

## 3. Paper texture varies between cards

**Cause:** there is one generated washi tile, and every card shows it at the same position.

**Change:**
- `generateWashi` already takes a `seed`. Generate **4 textures** with different seeds and slightly different "personalities": fibre density, number of cloudy patches, and a faint warm or cool tint. They are generated one per idle callback, so startup stays fast.
- Store them as CSS variables `--washi-0` … `--washi-3`.
- Paint the texture on a **pseudo-element** instead of the card's own background. A pseudo-element can be **rotated by any angle** and offset, which a background image can't. It's oversized so the corners stay covered.
- Each surface gets a small set of CSS variables: `--washi` (which texture), `--washi-angle`, `--washi-x` and `--washi-y`.
- Add one helper, `washiVariant(seed)`, to `src/lib/ui/washi.ts`. It returns those variables from a seed. It is deterministic (it uses the existing `prng`), so a surface doesn't flicker when it re-renders.
  - **Flashcards** get a random seed for every new card.
  - **Table cells, tiles and gallery items** use a hash of the kana id, so each kana always has "its own" sheet of paper.
- The `.washi` class stays the single place where paper is styled; components only set the variables.

**Decision C: how many textures, and which rotation**
- *Default:* **4 textures, any rotation angle, random offset.** 4 × 360° × offset gives effectively endless variation for about 4 × 30 ms of idle-time work.
- *Alternative:* **8 textures, rotated only in 90° steps.** This needs no pseudo-element, because a 90°-rotated tile can be pre-rendered on the canvas. It costs more memory and gives less variation.

**Tests:**
- Unit tests for `washiVariant`: deterministic for the same seed, values within range, different seeds give different variants.
- `generateWashi` with different seeds produces different output. This needs a canvas, so it runs in an e2e test that compares data URLs.
- e2e test: two consecutive flashcards have different `--washi-angle` values.

---

## 4. The SRS progress bar only moves on Easy

**Is this intended?** No, it's a bug in how progress is calculated.
- **Cause:** progress is currently `(total − remaining) / total`, where `remaining` includes cards that are still in the learning steps. On a new card, *Again*, *Hard* and *Good* all keep it in learning: it comes back within 1–10 minutes, as in Anki. So `remaining` doesn't drop. *Easy* graduates the card immediately, which is why only Easy moved the bar.

**Change:** separate "how far am I" from "what's left":
- The **bar** shows the share of the session's cards that you've **seen at least once**. `Session` tracks a set of answered ids, exposed as `session.seen`. So the bar moves on every new card, whatever the grade.
- The **counter** next to it shows what Anki shows. For example "12 left · 3 again" means 12 cards not yet seen and 3 cards that will come back because you're still learning them.
- The session ends, as now, when nothing is left (learning cards included).

**Decision D: how progress is shown**
- *Default:* **The bar shows cards seen, plus a counter "N left · M again".** It always moves forward, and it's honest about cards that are coming back.
- *Alternative:* **Anki's three coloured counters** (new / learning / review) without a bar. It's familiar to Anki users, but less glanceable.

**Tests:**
- Unit tests for `Session`: `seen` grows on every first answer whatever the grade, and repeats don't count twice.
- e2e test: grading a new card *Good* moves the bar and shows "1 again".

---

## 5. Listening: more time after answering

**Change:**
- After a **correct** answer, the pronunciation plays once more and the next card follows after **2 seconds** instead of 0.75. Pressing Enter, Space or "Next" skips the wait (the double-advance fix from last round already handles this).
- After a **wrong** answer, nothing changes: you still decide when to continue.

**Decision E: how to move on after a correct answer**
- *Default:* **Automatically after about 2 s, with the sound replayed.**
- *Alternative:* **Always wait for Next or Enter**, for correct answers too. This gives you full control but takes an extra key press per card.

**Tests:**
- Unit test for a new constant `LISTEN_ADVANCE_MS` and the advance logic. It's extracted into a tiny pure helper so it can be tested.
- e2e test with Playwright's clock control: the next card does not appear within 1.5 s, and does appear after the wait.

---

## 6. Background photo controls

**Change:**
- **Buttons:** next to the attribution in the bottom-right, add two small round buttons, **‹** and **›**, for the previous and next photo, plus a tooltip with the photo's title.
  - On phones, the attribution is hidden (see last round). Only the two buttons show there, small and semi-transparent, and only on Home and the Table, never during a study session, so they don't cover cards.
- **Settings:** replace "Change the photo every N cards" with a single **Photo** control:
  - **Rotate every N cards** (current behaviour, default 10)
  - **Rotate every N minutes** (default 5)
  - **Photo of the day**
  - **Keep fixed**: the photo you chose stays until you change it.
- **Thumbnail picker:** in Settings, a grid of all 24 photos as 640-px thumbnails. Picking one jumps to it. Clicking ‹ or › also selects a photo, and in *Keep fixed* mode that photo stays.
- **State:** settings gain `photoMode: 'cards' | 'minutes' | 'daily' | 'fixed'`, `photoMinutes` and `photoSlug` (the current or fixed photo). The existing `photoEvery`, `photos` and `calm` settings stay.
  - The slug is persisted, so a reload keeps the same photo. Today the photo is recalculated from the day on every load.
  - The index logic in `Background.svelte` moves into a small pure function, `nextPhotoIndex(mode, …)`, in `src/lib/ui/photos.ts`.
  - The schema version stays 1. The new fields get defaults through the existing `sanitizeSettings`.

**Decision F: which rotation modes to offer**
- *Default:* **all four modes**: cards, minutes, daily, fixed.
- *Alternative:* **Only "Rotate" (cards) and "Keep fixed"**, which is simpler.

**Decision G: buttons on phones**
- *Default:* **Show them on Home and the Table** only.
- *Alternative:* **Don't show them on phones** at all, and change the photo only from Settings.

**Tests:**
- Unit tests for `nextPhotoIndex`: wrap-around in both directions, each mode, and the daily photo being stable within a day.
- Unit test that old saves get the new settings' defaults.
- e2e tests: clicking › changes the image and the change survives a reload; "Keep fixed" doesn't change the photo after N cards; the thumbnail picker selects a photo.

---

## 7. New pronunciation audio

**Findings:**
- I searched Wikimedia Commons again. There's **no other complete set of kana recordings**. There are about 1,200 Japanese *word* recordings (Lingua Libre, usually CC BY-SA), but no single syllables.
- Forvo and the learning sites are not openly licensed.
- So the realistic route is to **generate** the audio with an open-source Japanese text-to-speech engine. Generation has two big extras:
  - It can also cover the **33 yōon** that have no audio today.
  - It can cover all **392 reading-practice words**, so word cards get a Listen button and the listening exercise can include yōon.

**Candidates:**

| Engine | Quality for Japanese | Licence of the generated audio | Notes |
|---|---|---|---|
| **VOICEVOX** (runs locally in Docker, `voicevox/voicevox_engine`) | Very natural. Built for Japanese. | Free, commercial use allowed, but **each voice has its own terms**. Most require a credit such as "VOICEVOX:ずんだもん". | Lets you edit the "audio query", so we can force the exact mora, length and pitch. This avoids text-to-speech quirks such as は being read "wa", or a lone ん. Several voices sound anime-like; a few are neutral, for example 白上虎太郎 (male), 冥鳴ひまり and No.7 (female). |
| **Kokoro-82M** (via `uv` + Python) | Good, sometimes slightly foreign-sounding | Apache-2.0 model, so the output is unrestricted | Only a few Japanese voices, and less control over individual morae |
| macOS `say` (Kyoko) and cloud text-to-speech (Google, Azure) | Good | Apple's licence doesn't allow redistributing the output; cloud services need an account and API key | Ruled out |

**VOICEVOX voices:** VOICEVOX has no male/female switch as such. Instead it has about 30 **characters**, each with its own voice and often several styles (normal, calm, whisper…). They include both **female voices** (for example 冥鳴ひまり, No.7, 春日部つむぎ, 四国めたん) and **male voices** (for example 白上虎太郎, 青山龍星, 玄野武宏). So a male/female setting is easy: we pick one female and one male character and generate the audio for both.

**Change:**
- A new script `scripts/generate-audio.ts`, plus `just audio`, replaces `fetch-audio.ts`. It:
  1. starts or uses a local VOICEVOX engine (`docker run voicevox/voicevox_engine`, CPU image)
  2. for each configured voice, generates every kana (all 104 sounds) and every word
  3. pins each mora's pitch and length for single kana, so they sound like a clear, neutral citation form
  4. trims, loudness-normalises and encodes to MP3 using the existing ffmpeg steps (shared code)
  5. writes `public/audio/{voice}/{id}.mp3`, `public/audio/{voice}/words/{n}.mp3` and a `SOURCES.json` with the credits
- The voices are listed in one small config, `scripts/voices.json`, for example `[{ id: 'female', speaker: …, credit: 'VOICEVOX:冥鳴ひまり' }, { id: 'male', … }]`. Adding or replacing a voice later only means editing that file and running `just audio`.
- **Choosing the voices:** before anything is committed, the script builds a **preview page** with 12 kana and 6 words in several neutral-sounding female and male candidates, plus the current Commons recordings for comparison. You pick one female and one male voice.
- **New setting:** Settings → Sound → **Voice: Female / Male**.
  - The audio engine adds the voice folder to the path (`audio/{voice}/…`). That's one new field in `AudioSettings`; nothing else in the views changes.
  - Changing the voice plays a sample straight away.
- The rest of the app hardly changes:
  - `Kana.audio` becomes true for every kana.
  - Words get an audio file and a Listen button.
  - The "No recording yet" notices disappear.
  - Listening and the table automatically include yōon.
  - Credits, NOTICE and the README list both VOICEVOX characters.
  - The Commons recordings are removed.
- **Size:** about (104 kana + 392 words) × 2 voices × ≈ 6 KB, roughly 6 MB in the repo.
  - Offline: the kana of **both** voices are pre-cached (≈ 1.2 MB), so switching voices works offline.
  - Word audio is cached as you hear it, so it doesn't bloat the first install.

**Decision H ✅:** VOICEVOX (decided). The specific characters will be chosen by you on the preview page.

**Decision I ✅:** two voices, one female and one male (decided). Settings → Sound → **Voice: Female / Male / Random**.
- **Random** picks a voice at random for each card, so you get used to different speakers.
- The default for new users is **Female**.
- The voice for a card is chosen once when the card is shown. Listen, autoplay and the replay in listening all use that same voice, so one card never switches speakers halfway.

**Decision J: audio for words**
- *Default:* **Yes**, generate audio for all words in both voices.
- *Alternative:* **Kana only.**

**Tests:**
- Unit tests for the script's pure parts: building the mora query per kana, mapping file names per voice, and validating `voices.json`.
- Every kana has an audio file **for each voice**, and the yōon are now included.
- Every word has an audio file for each voice.
- Engine unit test: the voice setting changes the path (`audio/male/shi.mp3`), and buffers for different voices don't share a cache entry.
- Settings unit test: old saves get `voice: 'female'`.
- e2e test: switching the voice in Settings makes the next Listen request the other voice's file. The "audio decodes" test covers both voices, a yōon and a word. The listening tests include yōon.

**Your input needed:**
- On the preview page, choose **one female and one male** voice.
- Confirm you're fine with the "VOICEVOX:<character>" credits in the app and README. Most voices require them.

---

## 8. Dot at the end of a stroke before it animates

**Cause:** each stroke uses `pathLength=1` with `stroke-dasharray: 1` and `stroke-dashoffset: 1`. That leaves a zero-length dash at the end of the path, and because the strokes have **round line caps**, the zero-length dash is drawn as a dot. The same dot appears on strokes that aren't shown yet in step mode.

**Change:** keep strokes that haven't started fully invisible:
- base `opacity: 0` for the animated and hidden states
- the `draw` keyframes start with `opacity: 1` at the same moment the dash starts growing
- use `animation-fill-mode: forwards` (not `both`), so the first keyframe doesn't apply during the delay
- in step mode, `.hidden` strokes get `opacity: 0`

**Test:** an e2e test opens the stroke-order modal and, right away, checks that the not-yet-started strokes (2 and 3 of あ) have computed opacity 0. A second check confirms that stroke 1 has opacity 1 once its animation is running.

---

## 9. Table details: buttons overflow for wide kana

**Cause:** the glyph box and the button column sit side by side. For two-character kana such as きゃ キャ, the glyphs push the buttons out of the 320-px panel.

**Change:** stack the layout vertically:
1. the glyph box and the romaji on one line
2. **a row of the three buttons below them** (Listen, Strokes, Fonts), which can wrap if needed
3. the per-deck list

This also makes the mobile layout simpler, so several of last round's mobile overrides can be removed.

**Test:** an e2e test selects きゃ and ゃ-type kana at a desktop width and asserts that every button's bounding box lies inside the panel's bounding box. It also runs for ファ when extended katakana is shown.

---

## 10. "Study in order" tile wraps onto two lines

**Change:**
- Replace あいう with **あ→ん**, which suggests going "from the start to the end, in order".
- Add `white-space: nowrap` to the tile art in Practice and Home, so no tile can ever wrap.

**Decision K: what the tile shows**
- *Default:* **あ→ん**.
- *Alternative:* **一二三** (1 2 3 in kanji; it would need adding to the font subset), or a small "list" icon like the Listening tile.

**Test:** an e2e test checks that every `.art` and `.tile-glyph` element is a single line, by comparing its height with its line height, on desktop and mobile.

---

## Order of work

1. **Quick fixes:** scrollbar (1), stroke dot (8), table panel (9), tile (10). Small and independent, one commit each.
2. **Progress bar (4)** and **listening delay (5)**: logic changes with unit tests.
3. **Grade-based sounds (2).**
4. **Washi variation (3).**
5. **Background controls (6).**
6. **Pronunciation (7):** build the generator and preview page, **wait for your choice of one female and one male voice**, then generate, add the voice setting, commit and wire in. This is the only step that needs your input along the way.

After each step: lint, type-check, unit tests and e2e tests (checking exit codes properly this time), then commit and push. I'll update `PLAN.md`'s status section at the end.

## Summary of decisions

All decisions are made. The VOICEVOX credits are approved.

| | Decision | Choice |
|---|---|---|
| A | Scrollbar | ✅ Always show it |
| B | Answer sounds | ✅ Pitch by grade: Hard low, Good middle, Easy high; Again or wrong = wood tock |
| C | Paper variation | ✅ 4 textures, any angle, offset |
| D | SRS progress | ✅ bar of cards seen + "N left · M again" |
| E | Listening after a correct answer | ✅ replay, auto-advance after ~2 s |
| F | Photo modes | ✅ cards / minutes / daily / fixed |
| G | Photo buttons on phones | ✅ Home and Table only |
| H | Pronunciation engine | ✅ VOICEVOX; characters chosen by you on the preview page |
| I | Voices | ✅ One female and one male voice; setting Female / Male / Random (random per card); default Female |
| J | Word audio | ✅ yes, both voices |
| K | "Study in order" tile | ✅ あ→ん |
