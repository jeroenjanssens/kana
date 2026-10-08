<script lang="ts">
  import type { HeatmapDay } from '../../lib/study/stats'
  import { t, lang } from '../../state/i18n.svelte'

  /** GitHub-style calendar of daily answers, drawn as ink-wash squares. */
  let { days, goalDays }: { days: HeatmapDay[]; goalDays?: Set<string> } = $props()

  const CELL = 12
  const GAP = 3
  const height = 7 * (CELL + GAP) + 18

  // Align the last column so that today is in its weekday row.
  const offset = $derived.by(() => {
    const last = days.at(-1)
    if (!last) return 0
    const [y, m, d] = last.key.split('-').map(Number)
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7 // Monday = 0
    return 6 - weekday
  })

  const weeks = $derived(Math.ceil((days.length + offset) / 7))
  const width = $derived(weeks * (CELL + GAP) + 24)

  const cells = $derived(
    days.map((day, i) => {
      const n = i + offset
      return { ...day, x: Math.floor(n / 7), y: n % 7 }
    }),
  )

  const locale = $derived(lang() === 'nl' ? 'nl-NL' : 'en-GB')

  const months = $derived.by(() => {
    const out: { x: number; label: string }[] = []
    let last = ''
    for (const c of cells) {
      const month = c.key.slice(0, 7)
      if (c.y === 0 && month !== last) {
        last = month
        const [y, m] = month.split('-').map(Number)
        out.push({
          x: c.x,
          label: new Date(y, m - 1, 1).toLocaleString(locale, { month: 'short' }),
        })
      }
    }
    return out.filter((m, i) => i === 0 || m.x - out[i - 1].x >= 3)
  })

  // Weekday initials for Mon/Wed/Fri rows (index 0=Mon in 0-based week).
  // Jan 1 2024 is a Monday, so we use it as a base.
  const weekdayLabels = $derived.by(() => {
    const base = new Date(2024, 0, 1) // Monday
    return [0, -1, 2, -1, 4, -1, -1].map((offset) =>
      offset >= 0
        ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset).toLocaleString(
            locale,
            { weekday: 'narrow' },
          )
        : '',
    )
  })

  const total = $derived(days.reduce((n, d) => n + d.count, 0))
</script>

<div class="heatmap">
  <svg
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label={t('stats.answersInLastYear', { total })}
  >
    {#each months as m (m.x)}
      <text class="month" x={24 + m.x * (CELL + GAP)} y="9">{m.label}</text>
    {/each}
    {#each weekdayLabels as label, i (i)}
      {#if label}<text class="weekday" x="0" y={18 + i * (CELL + GAP) + CELL - 2}>{label}</text
        >{/if}
    {/each}
    {#each cells as c (c.key)}
      <rect
        x={24 + c.x * (CELL + GAP)}
        y={16 + c.y * (CELL + GAP)}
        width={CELL}
        height={CELL}
        rx="3"
        class="l{c.level}"
        class:goal={goalDays?.has(c.key)}
      >
        <title>{t('stats.answersOnDay', { count: c.count, date: c.key })}</title>
      </rect>
    {/each}
  </svg>
  <div class="legend">
    <span>{t('stats.less')}</span>
    {#each [0, 1, 2, 3, 4] as l (l)}<span class="swatch l{l}"></span>{/each}
    <span>{t('stats.more')}</span>
  </div>
</div>

<style>
  .heatmap {
    overflow-x: auto;
  }

  svg {
    min-width: 640px;
    width: 100%;
    height: auto;
    display: block;
  }

  text {
    font-size: 8px;
    fill: var(--ink-faint);
    font-family: var(--font-ui);
  }

  rect,
  .swatch {
    fill: color-mix(in srgb, var(--ink) 7%, transparent);
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }

  .l1 {
    fill: color-mix(in srgb, var(--ink) 22%, transparent);
    background: color-mix(in srgb, var(--ink) 22%, transparent);
  }
  .l2 {
    fill: color-mix(in srgb, var(--ink) 42%, transparent);
    background: color-mix(in srgb, var(--ink) 42%, transparent);
  }
  .l3 {
    fill: color-mix(in srgb, var(--ink) 66%, transparent);
    background: color-mix(in srgb, var(--ink) 66%, transparent);
  }
  .l4 {
    fill: var(--shu);
    background: var(--shu);
  }

  /* Days on which the daily goal was reached get a vermilion outline, like a small seal. */
  rect.goal {
    stroke: var(--shu);
    stroke-width: 1.5;
  }

  .legend {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;
    font-size: 0.72rem;
    color: var(--ink-faint);
    margin-top: 0.4rem;
  }

  .swatch {
    width: 11px;
    height: 11px;
    border-radius: 3px;
  }
</style>
