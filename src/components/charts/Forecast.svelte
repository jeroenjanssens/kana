<script lang="ts">
  import { t, lang } from '../../state/i18n.svelte'

  /** Bar chart of reviews due on each of the coming days. */
  let { counts }: { counts: number[] } = $props()

  const max = $derived(Math.max(1, ...counts))
  const W = 28
  const H = 110
  const locale = $derived(lang() === 'nl' ? 'nl-NL' : 'en-GB')
  const labels = $derived(
    counts.map((_, i) => {
      if (i === 0) return t('stats.today')
      const d = new Date()
      d.setDate(d.getDate() + i)
      return i === 1 ? t('stats.tomorrow') : d.toLocaleDateString(locale, { weekday: 'narrow' })
    }),
  )
</script>

{#if counts.every((c) => c === 0)}
  <p class="empty">
    {t('stats.nothingScheduled')}
  </p>
{/if}
<svg
  viewBox="0 0 {counts.length * W} {H + 30}"
  role="img"
  aria-label={t('stats.reviewsDue', { counts: counts.join(', ') })}
>
  {#each counts as c, i (i)}
    {@const h = (c / max) * H}
    <g transform="translate({i * W} 0)">
      <rect
        x="5"
        y={H - h + 12}
        width={W - 10}
        height={Math.max(h, c ? 2 : 0)}
        rx="4"
        class:today={i === 0}
      />
      {#if c}<text class="value" x={W / 2} y={H - h + 8}>{c}</text>{/if}
      <text class="label" x={W / 2} y={H + 26}>{labels[i]}</text>
    </g>
  {/each}
  <line x1="0" x2={counts.length * W} y1={H + 12.5} y2={H + 12.5} />
</svg>

<style>
  .empty {
    font-size: 0.85rem;
    color: var(--ink-faint);
    margin: 0 0 0.5rem;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  rect {
    fill: color-mix(in srgb, var(--ink) 55%, transparent);
  }

  rect.today {
    fill: var(--shu);
  }

  line {
    stroke: var(--line);
  }

  text {
    text-anchor: middle;
    font-family: var(--font-ui);
    fill: var(--ink-faint);
  }

  .value {
    font-size: 9px;
    font-weight: 600;
    fill: var(--ink-soft);
  }

  .label {
    font-size: 8px;
  }
</style>
