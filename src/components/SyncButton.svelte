<script lang="ts">
  import { sync, syncNow } from '../state/sync.svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /** Sync now (only shown when a gist is connected); the arrows turn while it's syncing. */
  const label = $derived(sync.syncing ? t('settings.syncing') : t('settings.syncNow'))
</script>

{#if sync.connected}
  <button
    class="btn icon ghost"
    class:busy={sync.syncing}
    onclick={() => syncNow(true)}
    disabled={sync.syncing}
    aria-label={label}
    title={label}
  >
    <Icon name="sync" />
  </button>
{/if}

<style>
  .busy :global(svg) {
    animation: spin 1s linear infinite;
  }

  .busy:disabled {
    opacity: 1;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .busy :global(svg) {
      animation: none;
    }
  }
</style>
