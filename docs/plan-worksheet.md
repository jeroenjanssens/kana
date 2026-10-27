# Worksheet: plan

> **Status (2026-10-27): implemented.** One difference from this plan: ヴ (the only single-character extended kana) is left out too, so it doesn't get a row of its own.

A new practice mode that prints worksheets for writing kana by hand (プリント, the Japanese school word for a printed worksheet).

---

## Setup (`#/worksheet`)

Practice gets a new card, "Worksheet". Its art is three あ, fading from left to right, like a tiny worksheet. The page has the same kind of setup panel as Race:

- **Script:** Hiragana · Katakana · Both (`ScriptPicker`).
- **Rows:** the row chips (`RowPicker`) with Select all and Clear. Only rows of single characters: the basic and dakuten rows (in the groups enabled in Settings). Yōon and extended katakana (きゃ, ファ) are two characters each and are left out for now.
- **Random order:** off by default (table order is how you learn rows). When it's on, "Shuffle again" gives a new order.
- **Show romaji:** on by default.
- **Colour the strokes:** on by default: in the numbered square, each stroke, its start dot and its number get their own colour (red, green, blue, ochre, cyan, magenta: about equally light, and chosen to be as far apart as possible). Off: grey strokes with red numbers. The other squares never change.
- **Font:** for the first square and the traces: Klee One by default (a textbook font, 教科書体: handwritten forms, such as き and さ with their last strokes apart, and the endings of the strokes), "Stroke order" (drawn from the stroke data like the numbered square), or any of the app's fonts, grouped by style. The numbered square always shows the stroke data, so its colours keep working. Each font's glyphs are centred on their ink (measured on 日), and Print waits until the font has loaded.
- **Show grid:** on by default: the squares and their crosses. Off: a line between the rows instead.
- **Size:** Extra small · Small · Medium · Large · Extra large, with a note on the cell size and the number of rows per page.
- **Print** button, with a hint: print at 100% ("actual size", not "fit to page") for the real sizes, and choose "Save as PDF" in the print dialog to get a PDF.

New settings, synced like the race settings: `sheetScript` (`hiragana`), `sheetRows` (`['basic:a', 'basic:k']`), `sheetShuffle` (`false`), `sheetRomaji` (`true`), `sheetGrid` (`true`), `sheetColours` (`true`), `sheetFont` (`klee-one`; a font id, or `strokes`), `sheetSize` (`medium`). `sheetScript` and `sheetSize` only accept their known values.

Below the panel, a live preview of the actual pages (scaled to fit), with "N kana · M pages". The preview and the printed pages come from the same component, so they always match (including the romaji setting).

## A page

A4 portrait (210 × 297 mm), 12 mm margins.

- **Header (14 mm):** the script and the rows (their first kana), and Name and Date lines.
- **Rows:** one kana per row, as squares side by side:
  1. The kana in ink (the model).
  2. The kana in ink with red stroke numbers and a red dot where each stroke starts.
  3. Up to ten tracing squares: the kana in grey, fading from 45% to 8%.
  4. Blank squares for the rest of the width (at least two), to write it on your own.

  Every square has a thin border and a dashed cross (十字リーダー), as on Japanese practice paper. Under the model square, in a small band, the romaji (in the romanisation chosen in Settings), if "Show romaji" is on. With "Show grid" off (it's on by default), the squares and crosses are left out and a light horizontal line separates the rows instead. Turning romaji off keeps the row height, so the page count doesn't change.
- **Footer (6 mm):** "kana · 1 / 2".

All kana are drawn from the KanjiVG stroke data as SVG (not a font): vector, sharp in print, no font to load, and every square matches the numbered one exactly. The fading is opacity on the whole kana (`<g opacity>`), so crossing strokes don't get darker. Stroke numbers are at least about 1.7 mm high, with a white halo so they stay readable over the strokes.

## Sizes

Japanese adults write at about 7–8 mm; school notebooks have squares from about 10 mm (older pupils) to 18–22 mm (first grade).

| Size | Square | Squares per row | Row pitch | Rows per page |
|---|---|---|---|---|
| Extra small | 8 mm | 23 (10 traces, 11 blank) | 12 mm | 21 |
| Small | 10 mm | 18 (10 traces, 6 blank) | 14 mm | 18 |
| Medium | 13 mm | 14 (10 traces, 2 blank) | 18 mm | 14 |
| Large | 15 mm | 12 (8 traces, 2 blank) | 20 mm | 12 |
| Extra large | 18 mm | 10 (6 traces, 2 blank) | 24 mm | 10 |

Every row ends with at least two blank squares. Where there's no room for ten traces and two blank squares, there are fewer traces, fading from the same 45% to the same 8%, so quicker.

Usable area: 186 mm wide; 297 − 24 (margins) − 14 (header) − 6 (footer) = 253 mm high.

## Pagination and printing

- We split the pages ourselves (`paginate`), not the browser: rows never break across pages, the preview matches the print, and the page numbers work in every browser. Each page is a fixed 210 × 297 mm `<section>` with `break-after: page`.
- The printed copy of the pages is moved to the end of `<body>`. In print, everything else in `<body>` is hidden; `@page { size: A4; margin: 0 }`; light colours even in dark theme; `print-color-adjust: exact` so the red numbers print.
- The button calls `window.print()`. No PDF library: the print dialog can save as PDF.

## Code

| File | Change |
|---|---|
| `src/lib/study/worksheet.ts` | sizes, `cellsPerRow`, `rowsPerPage`, `fadeOpacities`, `cellKinds`, `worksheetRows`, `worksheetKana`, `paginate` |
| `src/lib/study/scripts.ts` | `SheetSize`, `SHEET_SIZES` (light, so the schema can import it) |
| `src/components/WorksheetPage.svelte` | one printed page: header, rows (one SVG per row), footer |
| `src/views/Worksheet.svelte` | setup, preview, print copy, print CSS |
| `src/lib/storage/schema.ts` | the new settings and their choices |
| `src/App.svelte`, `src/components/Header.svelte` | lazy route; Practice is highlighted in the nav |
| `src/views/Practice.svelte` | the new card |
| `src/lib/i18n/{en,nl}/practice.ts` | English and Dutch text |
| Tests | unit: sizes, pagination, which kana, fade steps, settings; e2e: setup and preview, page counts per size, romaji toggle, Print, and a printed PDF with the right number of pages |
