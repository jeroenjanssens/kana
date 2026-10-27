<script lang="ts">
  import { displayRomaji, glyph, type Kana } from '../lib/data/kana'
  import { GRID, strokeStart, strokesFor } from '../lib/data/strokes'
  import type { RomajiSystem } from '../lib/storage/schema'
  import type { Question } from '../lib/study/scripts'
  import { fontFamily } from '../lib/data/fonts'
  import {
    SHEET_MM,
    SHEET_STROKES,
    cellKinds,
    strokeColour,
    type SheetSize,
  } from '../lib/study/worksheet'
  import { t } from '../state/i18n.svelte'

  /**
   * One printed worksheet page (A4): a header, one row per kana (the kana, its numbered strokes,
   * traces that fade, then blank squares), and the page number. Drawn at its real size in mm.
   */
  let {
    kana,
    size,
    romaji,
    grid,
    colours,
    font,
    middle = 0.38,
    system,
    title,
    page,
    pages,
  }: {
    kana: readonly Question[]
    size: SheetSize
    romaji: boolean
    /** Squares with a dashed cross; without them, a line between the rows. */
    grid: boolean
    /** Each stroke of the numbered square, and its dot and number, in its own colour. */
    colours: boolean
    /** The font of the model and the traces, or 'strokes' to draw them like the numbered square. */
    font: string
    /** Where the middle of the font's ink is, in em above the baseline. */
    middle?: number
    system: RomajiSystem
    title: string
    page: number
    pages: number
  } = $props()

  const mm = $derived(SHEET_MM[size])
  const cells = $derived(cellKinds(size))
  /** About as big as the kana drawn from the stroke data. */
  const GLYPH_SIZE = 82
  const family = $derived(font === SHEET_STROKES ? undefined : fontFamily(font))
  // Stroke numbers at least about 1.7 mm high, whatever the size of the squares.
  const numberSize = $derived(Math.max(9, (1.7 / mm.cell) * GRID))

  function strokes(q: Question) {
    return strokesFor(glyph(q.kana, q.script)).flatMap((g) => g.strokes)
  }

  function numbers(q: Question): [number, number][] {
    return strokesFor(glyph(q.kana, q.script)).flatMap((g) => g.numbers)
  }

  /** The colour of a stroke in the numbered square; undefined keeps the usual ink and red. */
  function colour(stroke: number): string | undefined {
    return colours ? strokeColour(stroke) : undefined
  }

  function label(k: Kana): string {
    return displayRomaji(k, system)
  }
</script>

{#snippet guide(x: number)}
  <g class="guide" transform="translate({x} 0)">
    <line x1={GRID / 2} y1="0" x2={GRID / 2} y2={GRID} />
    <line x1="0" y1={GRID / 2} x2={GRID} y2={GRID / 2} />
  </g>
{/snippet}

<section
  class="sheet"
  class:lines={!grid}
  style:--cell="{mm.cell}mm"
  style:--pitch="{mm.pitch}mm"
  aria-label={t('worksheet.pageLabel', { page, pages })}
>
  <header>
    <strong>{title}</strong>
    <span class="field">{t('worksheet.name')}<span class="blank"></span></span>
    <span class="field">{t('worksheet.date')}<span class="blank short"></span></span>
  </header>

  <div class="rows">
    {#each kana as q, r (r)}
      {@const paths = strokes(q)}
      <div class="row">
        <svg
          viewBox="0 0 {cells.length * GRID} {GRID}"
          width="{cells.length * mm.cell}mm"
          height="{mm.cell}mm"
          role="img"
          aria-label={glyph(q.kana, q.script)}
        >
          {#each cells as cell, i (i)}
            {@const x = i * GRID}
            {#if grid}{@render guide(x)}{/if}
            {#if cell.kind !== 'blank'}
              <g
                class="kana"
                class:numbered={cell.kind === 'numbered'}
                transform="translate({x} 0)"
                opacity={cell.kind === 'trace' ? cell.opacity : undefined}
              >
                {#if family && cell.kind !== 'numbered'}
                  <text
                    class="glyph"
                    x={GRID / 2}
                    y={GRID / 2 + middle * GLYPH_SIZE}
                    font-family={family}
                    font-size={GLYPH_SIZE}>{glyph(q.kana, q.script)}</text
                  >
                {:else}
                  {#each paths as d, s (s)}
                    <path {d} style:stroke={cell.kind === 'numbered' ? colour(s) : undefined} />
                  {/each}
                {/if}
              </g>
            {/if}
            {#if cell.kind === 'numbered'}
              <g class="numbers" transform="translate({x} 0)" font-size={numberSize}>
                {#each paths as d, s (s)}
                  {@const [sx, sy] = strokeStart(d)}
                  <circle cx={sx} cy={sy} r="2.6" style:fill={colour(s)} />
                {/each}
                {#each numbers(q) as [nx, ny], s (s)}
                  <!-- KanjiVG places each number by its baseline at 8 px; centre it instead. -->
                  <text x={nx + 2.3} y={ny - 2.9} style:fill={colour(s)}>{s + 1}</text>
                {/each}
              </g>
            {/if}
          {/each}
          {#if grid}
            <rect class="border" x="0" y="0" width={cells.length * GRID} height={GRID} />
            {#each cells.slice(1) as _, i (i)}
              <line class="border" x1={(i + 1) * GRID} y1="0" x2={(i + 1) * GRID} y2={GRID} />
            {/each}
          {/if}
        </svg>
        <span class="romaji">{romaji ? label(q.kana) : ''}</span>
      </div>
    {/each}
  </div>

  <footer>{t('worksheet.footer', { page, pages })}</footer>
</section>

<style>
  /* Paper colours in every theme: this is what comes out of the printer. */
  .sheet {
    --sheet-ink: #1c1b19;
    --sheet-red: #c73e1d;
    --sheet-line: #8a8a8a;
    box-sizing: border-box;
    width: 210mm;
    height: 297mm;
    padding: 12mm;
    display: flex;
    flex-direction: column;
    background: #fff;
    color: var(--sheet-ink);
    font-family: var(--font-ui);
    overflow: hidden;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  header {
    height: 14mm;
    flex: none;
    display: flex;
    align-items: flex-start;
    gap: 5mm;
    font-size: 3.4mm;
    line-height: 1.2;
  }

  header strong {
    flex: 1;
    font-weight: 600;
  }

  .field {
    display: inline-flex;
    align-items: baseline;
    gap: 2mm;
    color: #555;
  }

  .blank {
    display: inline-block;
    /* Short enough to keep the title on one line, with every row in both scripts. */
    width: 30mm;
    border-bottom: 0.25mm solid var(--sheet-line);
  }

  .blank.short {
    width: 16mm;
  }

  .rows {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .row {
    box-sizing: border-box;
    height: var(--pitch);
    display: flex;
    flex-direction: column;
    /* Space above the squares, then the squares, then the romaji just under them. */
    padding-top: calc((var(--pitch) - var(--cell)) * 0.3);
  }

  /* Without the grid, a line between the rows keeps them apart. */
  .lines .row {
    border-bottom: 0.25mm solid #b8b8b8;
  }

  .lines .row:first-child {
    border-top: 0.25mm solid #b8b8b8;
  }

  svg {
    display: block;
    flex: none;
    /* The border is drawn on the edge: half of it falls outside. */
    overflow: visible;
  }

  .romaji {
    width: var(--cell);
    text-align: center;
    font-size: calc((var(--pitch) - var(--cell)) * 0.55);
    line-height: 1.1;
    color: #555;
  }

  .border {
    fill: none;
    stroke: var(--sheet-line);
    stroke-width: 0.75px;
    vector-effect: non-scaling-stroke;
  }

  .guide line {
    stroke: #c4c4c4;
    stroke-width: 0.5px;
    stroke-dasharray: 2px 2px;
    vector-effect: non-scaling-stroke;
  }

  .kana path {
    fill: none;
    stroke: var(--sheet-ink);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .glyph {
    fill: var(--sheet-ink);
    text-anchor: middle;
  }

  /* A little lighter, so the red numbers stand out. */
  .kana.numbered path {
    stroke: #6b665e;
  }

  .numbers circle {
    fill: var(--sheet-red);
  }

  .numbers text {
    fill: var(--sheet-red);
    font-family: var(--font-ui);
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    paint-order: stroke;
    stroke: #fff;
    stroke-width: 3;
    stroke-linejoin: round;
  }

  footer {
    height: 6mm;
    flex: none;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    font-size: 2.6mm;
    color: #777;
  }
</style>
