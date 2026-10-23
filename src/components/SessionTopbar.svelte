<script lang="ts">
  import type { Snippet } from 'svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /**
   * The bar across the top of a practice session: a way out, the title, a progress bar, and the
   * session's own counters (the children) on the right.
   */
  let {
    title,
    progress,
    onleave,
    leaveLabel = t('common.leave'),
    back = false,
    wide = false,
    children,
  }: {
    /** Plain text, or markup (styled by the view). */
    title: string | Snippet
    /** From 0 to 1; no bar when undefined. */
    progress?: number
    onleave: () => void
    leaveLabel?: string
    /** A back arrow instead of a close button. */
    back?: boolean
    wide?: boolean
    children?: Snippet
  } = $props()
</script>

<div class="topbar panel" class:wide>
  <button class="btn icon ghost" onclick={onleave} aria-label={leaveLabel}>
    <Icon name={back ? 'left' : 'close'} />
  </button>
  {#if typeof title === 'string'}<strong>{title}</strong>{:else}{@render title()}{/if}
  {#if progress !== undefined}<span class="bar" style:--p={progress}></span>{/if}
  {@render children?.()}
</div>

<style>
  .topbar {
    width: min(100%, 720px);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 1rem 0.35rem 0.35rem;
  }

  .topbar.wide {
    width: min(100%, 860px);
  }

  .bar {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--shu) calc(var(--p) * 100%),
      color-mix(in srgb, var(--ink) 10%, transparent) 0
    );
  }
</style>
