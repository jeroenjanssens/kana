<script lang="ts">
  import { fly } from 'svelte/transition'
  import type { MessageKey } from '../lib/i18n/messages'
  import { sync } from '../state/sync.svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /** A short message in the bottom right after each sync (and after a failed manual one). */
  let shown = $state<typeof sync.notice>()
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const notice = sync.notice
    if (!notice) return
    shown = notice
    clearTimeout(timer)
    timer = setTimeout(() => (shown = undefined), notice.ok ? 2500 : 6000)
  })
</script>

{#if shown}
  {#key shown.id}
    <div
      class="notice"
      class:error={!shown.ok}
      role={shown.ok ? 'status' : 'alert'}
      transition:fly={{ x: 16, duration: 220 }}
    >
      <Icon name={shown.ok ? 'check' : 'close'} size={16} />
      <span>{shown.ok ? t('sync.done') : t(`settings.syncError.${shown.error}` as MessageKey)}</span
      >
    </div>
  {/key}
{/if}

<style>
  .notice {
    position: fixed;
    right: calc(1rem + env(safe-area-inset-right));
    bottom: calc(3.25rem + env(safe-area-inset-bottom));
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: min(22rem, calc(100vw - 2rem));
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow);
    font-size: 0.9rem;
  }

  .notice.error {
    border-radius: 14px;
    background: var(--shu);
    color: #fff;
  }

  /* Above the tab bar on phones. */
  @media (max-width: 720px) {
    .notice {
      bottom: calc(84px + env(safe-area-inset-bottom));
    }
  }
</style>
