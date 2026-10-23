# Review fixes: plan

> **Status (2026-10-23): implemented.** Results, measured with `just perf`:
>
> | Table page | Baseline | Phase 1 | Phase 2 | Phase 4 | Final |
> |---|---|---|---|---|---|
> | Open, desktop | 1,079 ms | 47 ms | 46 ms | 46 ms | **46 ms** |
> | Open, phone (4× CPU) | 4,440 ms | 104 ms | 92–102 ms | 94 ms | **81 ms** |
> | Longest style recalc, phone | 4,415 ms | 29 ms | 23–25 ms | 23 ms | **23 ms** |
> | Toggle romaji, phone | 61 ms | 61 ms | 48–55 ms | 43 ms | **39 ms** |
>
> | Elsewhere | Before | After |
> |---|---|---|
> | Saving after an answer, with a full log of 50,000 reviews (Svelte dev build) | 764 ms | **0.9 ms** |
> | First-load JavaScript (gzip) | 63.4 KB, budget 62 KB | **56.6 KB** |
> | Precache | 459 entries, 7.67 MB (without the FSRS WASM) | **465 entries, 6.86 MB** (with it) |
> | Memory-hint drawings (raw / gzip) | 4.3 MB / 1.05 MB | **3.2 MB / 0.69 MB** |
> | e2e suite, wall clock (CPU) | 56.8 s (318 s) | **34.7 s (164 s)** |
> | Unit tests | 1,627 in 3.6 s | 1,650 in 3.8 s |
>
> Where the build differs from this plan:
> - **Phase 2:** `content-visibility: auto` made no measurable difference (92–102 ms either way), so it wasn't kept. `backdrop-filter` doesn't show up in the profile (paint ≤ 11 ms on the throttled phone), so the frosted panels stay.
> - **Phase 3:**
>   - The photo bug was wider than the daily rotation. In "cards" mode (the default) and in "minutes" mode, the photo also changes by itself. `chosenSettings()` in `merge.ts` now decides what counts as a settings change, and only counts the photo in "fixed" mode.
>   - `reviewedToday` skips entries from a *later day*, not every entry after `now`. Skipping everything after `now` would also drop today's reviews made a minute "in the future".
>   - Timers go through `src/lib/ui/timers.ts`, in eight views and RecordCompare, which also played a recording after you'd left.
> - **Phase 4:**
>   - Saving uses an incremental `SaveWriter`, not just one snapshot. Every log entry is serialised once, and the effect subscribes to the log's length instead of reading 50,000 entries through Svelte's proxies.
>   - Drawings are traced from a 2× upscale instead of 3×; it looks the same at 3× zoom. Curve tolerance made no difference. フ stays large (389 KB) because its halftone dots are real detail.
>   - Dutch users load their messages before the app mounts, so English never flashes.
> - **Phase 5:**
>   - `random.test.ts` didn't duplicate anything: the `prng` tests were in `washi.test.ts`, so they moved there.
>   - `budget.spec.ts` stays in Playwright, because it needs the build that Playwright's web server makes.
>   - Also fixed: `tsconfig.node.json` had the globs `scripts*.ts` and `tests/e2e*.ts`, so the scripts and e2e specs were never type-checked.
> - **Phase 6:**
>   - Built `SessionTopbar` (seven views) and `QuizQuestion` (the timed question shared by Sprint and Race). `.page-head` and `.eyebrow.light` moved to `app.css`.
>   - `SessionDone` was not built. The done screens differ in width, alignment, seals and actions, so a component would need about as many props as the lines it saves.
>   - A pixel comparison of 16 pages on desktop and phone showed two differences. Listen's and Write's close button is now the round ghost button of every other session; a local `.icon` rule meant for the deck tile used to restyle it. On phones, the Stats, Settings and Credits headings sit about 2 px further from the content, the same spacing as the other pages.

This plan implements every suggestion from the October 2026 code review: Table performance, correctness bugs, load performance, the test suite, and duplication across the study views.

The work is done in phases. Each phase is measured with `scripts/perf.ts`, which builds the app, serves it, and profiles the Table page in Chromium:

- **Desktop**: 1440×900 at DPR 2.
- **Mobile**: 412×915 at DPR 2.6 with 4× CPU throttling, which is roughly a mid-range phone.
- In both, every kana is seeded as mastered, so all 208 cells show colours and seals.

## Baseline (before any change)

| Metric | Desktop | Mobile (4× CPU) |
|---|---|---|
| Home → Table, median of 5 | 1,256 ms | **4,869 ms** |
| Longest style recalc | 1,233 ms | 4,983 ms |
| Click a cell (2 frames) | 54 ms | 141 ms |
| Toggle romaji | 30 ms | 52 ms |
| Layout, longest | 7 ms | 33 ms |

Other baseline numbers:

| | |
|---|---|
| Unit tests | 1,627 tests in 3.6 s |
| e2e (desktop + mobile projects) | 181 passed, 17 skipped, 56.8 s |
| Precache | 459 entries, 7.67 MB |
| Largest JS chunk | `katakana/fu` drawing, 404 KB |

## Phase 1: washi textures as blob URLs

**Cause:** `App.svelte` stores four 400–530 KB PNG data URLs in custom properties on `<html>`. Every `.washi` element resolves `var(--washi-tex)` and Chrome re-parses the huge `url()` string for each one.

**Change:**
- `generateWashi` draws the sheet and returns a `Blob` via `canvas.toBlob()`, which encodes off the main thread and skips base64.
- `App.svelte` sets `url(blob:…)` and revokes the previous URLs when the theme changes.
- Texture generation moves into its own effect that depends only on the theme. Toggling reduced motion no longer regenerates the sheets.

**Decision: runtime blobs, not build-time files.**
- *Chosen:* **Generate at runtime.** One sheet takes 7–28 ms to draw (30–40 ms at 4× CPU), in idle callbacks, and costs 0 bytes of network.
- *Rejected:* **Build-time image files.** The smallest acceptable encoding (AVIF q60) is about 240 KB per theme, downloaded on the first visit and precached. That costs more than it saves.

**Tests:** unit tests for the blob path and URL revocation. The existing washi tests are kept.

## Phase 2: Table rendering

- **Hanko:** the `hanko-rough` filter moves from every instance into `InkDefs.svelte`. This removes 208 duplicate DOM ids on a fully mastered table, and up to 7 in the details panel.
- **Offscreen groups:** `content-visibility: auto` with `contain-intrinsic-size` on the group panels, so groups below the fold are not styled, laid out or painted until they scroll into view. It is kept only if it measurably helps.
- **`backdrop-filter`:** measured with mobile throttling once phase 1 has landed. The frosted look is part of the design, so it only changes if it shows up in the profile.

## Phase 3: correctness bugs

1. **Photo rotation changes the settings timestamp.** The daily rotation in `loadPhotos` writes `photoSlug` and `photoDay`, which bumps `settingsUpdatedAt`. That lets a device that just opened the app win the settings merge on the next sync. *Fix:* the timestamp effect ignores the fields the app rotates by itself. Choosing a photo with the arrows still counts as a change.
2. **Timers outlive their view.** Listen (advance), Study (celebration and next card), Reading (autoplay) and Drills (next round) fire after you leave, and play audio on the next page. *Fix:* clear or guard the timers on destroy, then audit every `setTimeout` in `src/views` and `src/components`.
3. **Gist search stops at 100.** `find()` follows the `Link: rel="next"` pagination, so a new device finds an older kana gist instead of creating a duplicate.
4. **FSRS WASM is not precached.** Add `**/*.wasm` to the precache globs so the optimizer works offline.
5. **`startPersistence` leaks its `visibilitychange` listener.** Name the listener and remove it in the cleanup.
6. **Romaji inputs have an English label.** The `aria-label` in Sprint and Race comes from the locale files.
7. **`reviewedToday` stops at future entries.** Clock-skewed entries from a synced device are skipped, not treated as the end of today.

## Phase 4: load and save performance

1. **One snapshot per save.** Persistence currently deep-snapshots the save file twice per change. It now subscribes once and serialises once.
2. **One locale in the first load.** English stays bundled as the fallback. Dutch is loaded on demand, and `t()` keeps working while it loads by falling back to English.
3. **Smaller drawings.** Re-trace the Tofugu drawings with tuned potrace settings (speckle size and curve tolerance), checked visually with `--preview`. The goal is to shrink the 150–400 KB outliers without visible change.

## Phase 5: tests

- **Remove:** delete `sanity.test.ts`, and move `shuffle` into `washi.test.ts` (renamed `random.test.ts` covering prng, shuffle and washi).
- **e2e sleeps:**
  - `savedData()` polls localStorage until the debounced save has landed, instead of sleeping 500 ms.
  - The confusable quiz waits for each round to change instead of sleeping 1.7 s.
- **Add:**
  - `daily.ts`, including the future-entry case.
  - The photo rotation not touching `settingsUpdatedAt`.
  - Gist pagination.
  - Leaving Listen during the advance delay.

## Phase 6: duplication in the study views

1. **Shared styles in `app.css`.** `.page-head`, `.eyebrow.light`, `.lead`, the session `.topbar` and the progress `.bar` move into the global stylesheet. Views keep only their differences.
2. **`SessionTopbar.svelte`:** leave button, title, progress bar, and a snippet for the right-hand side (time, score, counts, undo).
3. **`SessionDone.svelte`:** eyebrow, heading, summary and actions, as snippets.
4. **Sprint and Race:** shared timing, answering and keyboard logic in `src/lib/study/quiz.ts` (or a shared component) where they really are the same.

Each refactor must keep every e2e test passing unchanged.

## Phase 7: final measurement

- Re-run `scripts/perf.ts`, the unit tests and the e2e suite.
- Record every phase's numbers in a results table at the top of this file.
- Add `just perf`.
