<script lang="ts">
  import type { MasteryLevel } from '../lib/srs/queue'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  let { counts, total }: { counts: Record<MasteryLevel, number>; total: number } = $props()
  const LEVELS: { key: MasteryLevel }[] = [
    { key: 'mature' },
    { key: 'young' },
    { key: 'learning' },
    { key: 'new' },
  ]
</script>

<div
  class="bar"
  role="img"
  aria-label={LEVELS.map(
    (l) => `${counts[l.key]} ${t(`study.mastery.${l.key}` as MessageKey).toLowerCase()}`,
  ).join(', ')}
>
  {#each LEVELS as l (l.key)}
    {#if counts[l.key] > 0}
      <span
        class="seg {l.key}"
        style:flex-grow={counts[l.key]}
        title={t('study.mastery.titleSegment', {
          label: t(`study.mastery.${l.key}` as MessageKey),
          count: String(counts[l.key]),
          total: String(total),
        })}
      ></span>
    {/if}
  {/each}
</div>

<style>
  .bar {
    display: flex;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--level-new);
    gap: 2px;
  }

  .seg {
    flex-basis: 0;
    min-width: 3px;
  }

  .mature {
    background: var(--level-mature);
  }

  .young {
    background: var(--level-young);
  }

  .learning {
    background: var(--level-learning);
  }

  .new {
    background: var(--level-new);
  }
</style>
