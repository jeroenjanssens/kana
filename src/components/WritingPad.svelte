<script lang="ts">
  import type { StrokeGlyph } from '../lib/data/strokes'
  import type { Point, WritingResult } from '../lib/study/handwriting'
  import Icon from './Icon.svelte'

  /**
   * A paper square to draw kana on, in the same 109-unit grid as the KanjiVG strokes. After a
   * check, the correct strokes are shown in red with their numbers, and wrong strokes are marked.
   */
  let {
    strokes = $bindable([]),
    cells = 1,
    size = 300,
    reference,
    result,
    disabled = false,
  }: {
    strokes?: Point[][]
    /** Number of characters side by side (2 for yōon). */
    cells?: number
    size?: number
    reference?: StrokeGlyph[]
    result?: WritingResult
    disabled?: boolean
  } = $props()

  const GRID = 109
  /** Two-character kana get a slightly smaller grid so they still fit on a phone. */
  const scale = $derived(cells > 1 ? 0.72 : 1)
  let svg = $state<SVGSVGElement>()
  let drawing = $state<Point[] | undefined>()

  function toPoint(e: PointerEvent): Point {
    const rect = svg!.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * GRID * cells,
      ((e.clientY - rect.top) / rect.height) * GRID,
    ]
  }

  function down(e: PointerEvent) {
    if (disabled) return
    e.preventDefault()
    svg?.setPointerCapture(e.pointerId)
    drawing = [toPoint(e)]
  }

  function move(e: PointerEvent) {
    if (!drawing) return
    const p = toPoint(e)
    const last = drawing.at(-1)!
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.8) drawing = [...drawing, p]
  }

  function up() {
    if (!drawing) return
    strokes = [...strokes, drawing]
    drawing = undefined
  }

  const path = (points: Point[]) =>
    points.length === 1
      ? `M${points[0][0]},${points[0][1]}l0.01,0`
      : `M${points.map((p) => p.join(',')).join('L')}`

  const wrong = $derived(new Set(result?.strokes.filter((s) => !s.ok).map((s) => s.index) ?? []))
</script>

<div class="pad">
  <svg
    bind:this={svg}
    class="washi"
    viewBox="0 0 {GRID * cells} {GRID}"
    width={size * cells * scale}
    height={size * scale}
    role="img"
    aria-label="Drawing area: {strokes.length} stroke{strokes.length === 1 ? '' : 's'} drawn"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
  >
    {#each Array.from({ length: cells }, (_, i) => i) as i (i)}
      <g class="grid" transform="translate({i * GRID} 0)">
        <line x1={GRID / 2} y1="4" x2={GRID / 2} y2={GRID - 4} />
        <line x1="4" y1={GRID / 2} x2={GRID - 4} y2={GRID / 2} />
      </g>
    {/each}
    {#if result && reference}
      <g class="reference">
        {#each reference as g (g.x)}
          {#each g.strokes as d, i (i)}
            <path {d} transform="translate({g.x} 0)" />
          {/each}
        {/each}
      </g>
    {/if}
    <g class="ink">
      {#each strokes as s, i (i)}
        <path d={path(s)} class:wrong={wrong.has(i)} />
      {/each}
      {#if drawing}<path d={path(drawing)} />{/if}
    </g>
    {#if result && reference}
      <g class="numbers">
        {#each reference.flatMap((g) => g.numbers.map((n) => [n[0] + g.x, n[1]])) as n, i (i)}
          <text x={n[0]} y={n[1]}>{i + 1}</text>
        {/each}
      </g>
    {/if}
  </svg>
  <div class="tools">
    <button
      class="btn small ghost"
      onclick={() => (strokes = strokes.slice(0, -1))}
      disabled={disabled || !strokes.length}
      aria-label="Undo stroke"><Icon name="undo" size={16} /> Stroke</button
    >
    <button
      class="btn small ghost"
      onclick={() => (strokes = [])}
      disabled={disabled || !strokes.length}
      aria-label="Clear drawing"><Icon name="close" size={16} /> Clear</button
    >
  </div>
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  svg {
    max-width: 92vw;
    height: auto;
    border-radius: 16px;
    box-shadow: var(--shadow);
    touch-action: none;
    cursor: crosshair;
    user-select: none;
    -webkit-user-select: none;
  }

  .grid line {
    stroke: var(--shu-soft);
    stroke-width: 0.6;
    stroke-dasharray: 2 2;
  }

  .ink path {
    fill: none;
    stroke: var(--ink);
    stroke-width: 4.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: url(#ink);
  }

  .ink path.wrong {
    stroke: var(--shu);
  }

  .reference path {
    fill: none;
    stroke: color-mix(in srgb, var(--shu) 45%, transparent);
    stroke-width: 7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .numbers text {
    font-family: var(--font-ui);
    font-size: 7px;
    font-weight: 700;
    fill: var(--shu);
  }

  .tools {
    display: flex;
    gap: 0.25rem;
  }
</style>
