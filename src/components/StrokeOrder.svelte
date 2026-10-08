<script lang="ts">
  import { untrack } from 'svelte'
  import type { StrokeGlyph } from '../lib/data/strokes'
  import Icon from './Icon.svelte'
  import { t } from '../state/i18n.svelte'

  /** Animated stroke order for a kana, drawn in ink, stroke by stroke. */
  let {
    text,
    size = 220,
    autoplay = true,
  }: { text: string; size?: number; autoplay?: boolean } = $props()

  const STROKE_MS = 650
  const GAP_MS = 180

  const GRID = 109
  // Stroke data (~50 KB) is only loaded when a stroke-order animation is first shown.
  let lookup = $state<((text: string) => StrokeGlyph[]) | undefined>()
  $effect(() => {
    void import('../lib/data/strokes').then((m) => (lookup = m.strokesFor))
  })
  const glyphs = $derived(lookup ? lookup(text) : [])
  const strokes = $derived(
    glyphs.flatMap((g) =>
      g.strokes.map((d, i) => ({ d, x: g.x, number: g.numbers[i], small: false })),
    ),
  )
  const width = $derived(GRID * Math.max(1, glyphs.length))

  let run = $state(0)
  let step = $state<number | undefined>(undefined)
  let showNumbers = $state(true)

  $effect(() => {
    // Restart when the kana changes.
    void text
    untrack(() => {
      step = autoplay ? undefined : 0
      run++
    })
  })

  function replay() {
    step = undefined
    run++
  }

  function next() {
    step = step === undefined ? 1 : Math.min(strokes.length, step + 1)
  }

  function prev() {
    step = Math.max(0, (step ?? strokes.length) - 1)
  }
</script>

<figure class="stroke-order">
  <svg
    viewBox="0 0 {width} {GRID}"
    width={(size * width) / GRID}
    height={size}
    role="img"
    aria-label={t('study.strokeOrder.ariaLabel', { text, n: strokes.length })}
  >
    {#each glyphs as g (g.x)}
      <g class="grid" transform="translate({g.x} 0)">
        <rect x="1" y="1" width={GRID - 2} height={GRID - 2} rx="6" />
        <line x1={GRID / 2} y1="4" x2={GRID / 2} y2={GRID - 4} />
        <line x1="4" y1={GRID / 2} x2={GRID - 4} y2={GRID / 2} />
      </g>
    {/each}
    <g class="ghost">
      {#each strokes as s, i (i)}
        <path d={s.d} transform="translate({s.x} 0)" />
      {/each}
    </g>
    {#key run}
      <g class="ink">
        {#each strokes as s, i (i)}
          {@const visible = step === undefined || i < step}
          <path
            d={s.d}
            transform="translate({s.x} 0)"
            pathLength="1"
            class:animate={step === undefined}
            class:hidden={!visible}
            style:animation-delay="{i * (STROKE_MS + GAP_MS)}ms"
            style:animation-duration="{STROKE_MS}ms"
          />
        {/each}
      </g>
      {#if showNumbers}
        <g class="numbers">
          {#each strokes as s, i (i)}
            {#if s.number && (step === undefined || i < step)}
              <text
                x={s.number[0] + s.x}
                y={s.number[1]}
                class:animate={step === undefined}
                style:animation-delay="{i * (STROKE_MS + GAP_MS)}ms">{i + 1}</text
              >
            {/if}
          {/each}
        </g>
      {/if}
    {/key}
  </svg>
  <figcaption>
    <button class="btn small ghost" onclick={replay} aria-label={t('study.strokeOrder.replay')}>
      <Icon name="replay" size={16} />
      {t('study.strokeOrder.replayBtn')}
    </button>
    <button class="btn small ghost" onclick={prev} aria-label={t('study.strokeOrder.prevStroke')}>
      <Icon name="left" size={16} />
    </button>
    <span class="count">{step ?? strokes.length} / {strokes.length}</span>
    <button class="btn small ghost" onclick={next} aria-label={t('study.strokeOrder.nextStroke')}>
      <Icon name="right" size={16} />
    </button>
    <label class="numbers-toggle">
      <input type="checkbox" bind:checked={showNumbers} />
      {t('study.strokeOrder.numbers')}
    </label>
  </figcaption>
</figure>

<style>
  .stroke-order {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  svg {
    max-width: 100%;
    height: auto;
  }

  .grid rect {
    fill: color-mix(in srgb, var(--paper) 70%, transparent);
    stroke: var(--shu-soft);
    stroke-width: 0.8;
  }

  .grid line {
    stroke: var(--shu-soft);
    stroke-width: 0.6;
    stroke-dasharray: 2 2;
  }

  .ghost path {
    fill: none;
    stroke: color-mix(in srgb, var(--ink) 9%, transparent);
    stroke-width: 4.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .ink path {
    fill: none;
    stroke: var(--ink);
    stroke-width: 4.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    filter: url(#ink);
  }

  /* Strokes that haven't started are fully invisible: with round line caps, the zero-length
     dash left at dashoffset 1 would otherwise show up as a dot at the end of the stroke. */
  .ink path.animate {
    opacity: 0;
    stroke-dashoffset: 1;
    animation-name: draw;
    animation-timing-function: cubic-bezier(0.45, 0.05, 0.4, 1);
    animation-fill-mode: forwards;
  }

  .ink path.hidden {
    opacity: 0;
  }

  @keyframes draw {
    from {
      opacity: 1;
      stroke-dashoffset: 1;
    }
    to {
      opacity: 1;
      stroke-dashoffset: 0;
    }
  }

  .numbers text {
    font-family: var(--font-ui);
    font-size: 8px;
    font-weight: 600;
    fill: var(--shu);
  }

  .numbers text.animate {
    opacity: 0;
    animation: appear 0.2s forwards;
  }

  @keyframes appear {
    to {
      opacity: 1;
    }
  }

  figcaption {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
    justify-content: center;
    font-size: 0.85rem;
  }

  .count {
    min-width: 3.5em;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
  }

  .numbers-toggle {
    display: inline-flex;
    gap: 0.35em;
    align-items: center;
    margin-left: 0.5rem;
    color: var(--ink-soft);
  }
</style>
