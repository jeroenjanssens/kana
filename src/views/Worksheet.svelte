<script lang="ts">
  import { fly } from 'svelte/transition'
  import RowPicker from '../components/RowPicker.svelte'
  import ScriptPicker from '../components/ScriptPicker.svelte'
  import WorksheetPage from '../components/WorksheetPage.svelte'
  import { FONTS, FONT_STYLES, fontFamily, type FontStyle } from '../lib/data/fonts'
  import type { MessageKey } from '../lib/i18n/messages'
  import {
    PAGE,
    SHEET_MM,
    SHEET_SIZES,
    SHEET_STROKES,
    paginate,
    rowsPerPage,
    worksheetKana,
    worksheetOrder,
    worksheetRows,
  } from '../lib/study/worksheet'
  import { loadFont, loadFontWithin } from '../lib/ui/fontLoader'
  import { settings } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'

  /**
   * Worksheets for writing by hand: choose the kana and the size, see the pages, and print them
   * (or save them as a PDF from the print dialog).
   */
  const s = settings()

  const rows = $derived(worksheetRows(s.sheetScript, s.groups))
  const chosen = $derived(worksheetKana({ script: s.sheetScript, rows: s.sheetRows }, s.groups))
  /** Bumped by "Shuffle again". */
  let shuffles = $state(0)
  const order = $derived.by(() => {
    void shuffles
    return worksheetOrder(chosen, s.sheetShuffle)
  })
  const pages = $derived(paginate(order, rowsPerPage(s.sheetSize)))

  /** The fonts to choose from, by style. */
  const fontGroups = Object.entries(FONT_STYLES).map(([style, name]) => ({
    name,
    fonts: FONTS.filter((f) => f.style === (style as FontStyle)),
  }))

  /**
   * Where the middle of the ink is in the chosen font, in em above the baseline: fonts place their
   * glyphs differently, so the kana are centred on what's drawn. Measured on 日, which fills the
   * square that kana are designed in (and is in every font subset).
   */
  let middle = $state(0.38)
  $effect(() => {
    const id = s.sheetFont
    if (id === SHEET_STROKES) return
    void loadFont(id).then(() => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx || s.sheetFont !== id) return
      ctx.font = `100px ${fontFamily(id)}`
      const m = ctx.measureText('日')
      if (m.actualBoundingBoxAscent) {
        middle = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 200
      }
    })
  })

  /** Print once the font is there, so it doesn't print in a fallback. */
  async function print() {
    if (s.sheetFont !== SHEET_STROKES) await loadFontWithin(s.sheetFont, 4000)
    await document.fonts.ready
    window.print()
  }

  const title = $derived.by(() => {
    const script =
      s.sheetScript === 'both'
        ? t('common.hiraganaAndKatakana')
        : t(`common.${s.sheetScript}` as MessageKey)
    const first = rows
      .filter((r) => s.sheetRows.includes(r.key))
      .map((r) =>
        s.sheetScript === 'katakana'
          ? r.kana[0].katakana
          : r.kana[0].hiragana || r.kana[0].katakana,
      )
    return `${script} · ${first.join(' ')}`
  })

  // The preview shows the pages at their real size, scaled down to fit.
  let previewWidth = $state(0)
  const pageWidthPx = (PAGE.width / 25.4) * 96
  const zoom = $derived(previewWidth ? Math.min(1, previewWidth / pageWidthPx) : 0.5)

  /** Moves the printed copy to the end of <body>, so print can hide everything else. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return { destroy: () => node.remove() }
  }
</script>

<header class="page-head">
  <p class="eyebrow light">{t('worksheet.eyebrow')}</p>
  <h1>{t('worksheet.heading')}</h1>
  <p class="lead">{t('worksheet.lead')}</p>
</header>

<section class="panel setup" in:fly={{ y: 12 }}>
  <div class="field">
    <span class="label">{t('common.scriptLabel')}</span>
    <ScriptPicker bind:value={s.sheetScript} />
  </div>
  <div class="field rows">
    <span class="label">{t('worksheet.rowsLabel')}</span>
    <RowPicker
      {rows}
      katakana={s.sheetScript === 'katakana'}
      both={s.sheetScript === 'both'}
      bind:selected={s.sheetRows}
    />
    <div class="row">
      <button class="btn small ghost" onclick={() => (s.sheetRows = rows.map((r) => r.key))}
        >{t('study.setup.selectAll')}</button
      >
      <button class="btn small ghost" onclick={() => (s.sheetRows = [])}
        >{t('study.setup.clear')}</button
      >
    </div>
  </div>
  <div class="field">
    <span class="label">{t('worksheet.sizeLabel')}</span>
    <div class="segmented sizes" role="group" aria-label={t('worksheet.sizeLabel')}>
      {#each SHEET_SIZES as size (size)}
        <button aria-pressed={s.sheetSize === size} onclick={() => (s.sheetSize = size)}
          >{t(`worksheet.size.${size}` as MessageKey)}</button
        >
      {/each}
    </div>
    <span class="muted small"
      >{t('worksheet.sizeNote', {
        mm: SHEET_MM[s.sheetSize].cell,
        rows: rowsPerPage(s.sheetSize),
      })}</span
    >
  </div>
  <div class="field">
    <label class="label" for="sheet-font">{t('worksheet.fontLabel')}</label>
    <select id="sheet-font" bind:value={s.sheetFont}>
      <option value={SHEET_STROKES}>{t('worksheet.fontStrokes')}</option>
      {#each fontGroups as group (group.name)}
        <optgroup label={group.name}>
          {#each group.fonts as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
        </optgroup>
      {/each}
    </select>
    <span class="muted small">{t('worksheet.fontNote')}</span>
  </div>
  <div class="switches">
    <label class="switch"
      ><span>{t('worksheet.shuffle')}</span><input
        type="checkbox"
        bind:checked={s.sheetShuffle}
      /></label
    >
    <label class="switch"
      ><span>{t('worksheet.romaji')}</span><input
        type="checkbox"
        bind:checked={s.sheetRomaji}
      /></label
    >
    <label class="switch"
      ><span>{t('worksheet.grid')}</span><input type="checkbox" bind:checked={s.sheetGrid} /></label
    >
    <label class="switch"
      ><span>{t('worksheet.colours')}</span><input
        type="checkbox"
        bind:checked={s.sheetColours}
      /></label
    >
  </div>
  <div class="go">
    <span class="muted">
      {#if !chosen.length}{t('worksheet.empty')}{:else}{t('worksheet.summary', {
          count: chosen.length,
          pages: pages.length,
        })}{/if}
    </span>
    <div class="row">
      {#if s.sheetShuffle && chosen.length > 1}
        <button class="btn" onclick={() => shuffles++}>{t('worksheet.reshuffle')}</button>
      {/if}
      <button class="btn primary" disabled={!chosen.length} onclick={print}
        >{t('worksheet.print')}</button
      >
    </div>
  </div>
  <p class="muted small hint">{t('worksheet.printHint')}</p>
</section>

{#snippet sheets()}
  {#each pages as kana, i (i)}
    <WorksheetPage
      {kana}
      size={s.sheetSize}
      romaji={s.sheetRomaji}
      grid={s.sheetGrid}
      colours={s.sheetColours}
      font={s.sheetFont}
      {middle}
      system={s.romaji}
      {title}
      page={i + 1}
      pages={pages.length}
    />
  {/each}
{/snippet}

{#if pages.length}
  <section class="preview" aria-label={t('worksheet.preview')} bind:clientWidth={previewWidth}>
    <div class="pages" style:zoom>
      {@render sheets()}
    </div>
  </section>
  <div class="worksheet-print" use:portal>
    {@render sheets()}
  </div>
{/if}

<style>
  .lead {
    max-width: 58ch;
  }

  .setup {
    width: min(100%, 640px);
    padding: 1.25rem 1.4rem;
    display: grid;
    gap: 1rem;
  }

  .field {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }

  .label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-soft);
  }

  .rows :global(.rows) {
    margin: 0;
  }

  .small {
    font-size: 0.85rem;
  }

  /* Five sizes don't fit on one line on a phone. */
  .sizes {
    max-width: 100%;
    flex-wrap: wrap;
    border-radius: 20px;
  }

  .go {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .hint {
    margin: 0;
  }

  .preview {
    width: min(100%, 640px);
    margin-top: 1.5rem;
  }

  .pages {
    display: grid;
    gap: 6mm;
  }

  .pages :global(.sheet) {
    box-shadow: var(--shadow);
  }

  .worksheet-print {
    display: none;
  }

  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    :global(html),
    :global(body) {
      background: #fff !important;
    }

    :global(body:has(> .worksheet-print) > :not(.worksheet-print)) {
      display: none !important;
    }

    .worksheet-print {
      display: block;
    }

    .worksheet-print :global(.sheet) {
      break-after: page;
    }

    .worksheet-print :global(.sheet:last-child) {
      break-after: auto;
    }
  }
</style>
