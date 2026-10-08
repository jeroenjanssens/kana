<script lang="ts">
  import type { MasteryLevel } from '../lib/srs/queue'

  let { counts, total }: { counts: Record<MasteryLevel, number>; total: number } = $props()
  const LEVELS: { key: MasteryLevel; label: string }[] = [
    { key: 'mature', label: 'Mastered' },
    { key: 'young', label: 'Young' },
    { key: 'learning', label: 'Learning' },
    { key: 'new', label: 'New' },
  ]
</script>

<div
  class="bar"
  role="img"
  aria-label={LEVELS.map((l) => `${counts[l.key]} ${l.label.toLowerCase()}`).join(', ')}
>
  {#each LEVELS as l (l.key)}
    {#if counts[l.key] > 0}
      <span
        class="seg {l.key}"
        style:flex-grow={counts[l.key]}
        title="{l.label}: {counts[l.key]} of {total}"
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
