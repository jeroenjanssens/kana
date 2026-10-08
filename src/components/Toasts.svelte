<script lang="ts">
  import { fly } from 'svelte/transition'
  import { dismissToast, ui } from '../state/ui.svelte'
</script>

<div class="toasts" aria-live="polite">
  {#each ui.toasts as t (t.id)}
    <div class="toast" transition:fly={{ y: 16, duration: 250 }}>
      <span>{t.text}</span>
      {#if t.action}
        <button
          class="btn small shu"
          onclick={() => {
            t.action?.run()
            dismissToast(t.id)
          }}>{t.action.label}</button
        >
      {/if}
      <button class="close" onclick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: calc(24px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem 0.6rem 1.1rem;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow);
    font-size: 0.9rem;
  }

  .close {
    border: 0;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.3rem;
  }

  @media (max-width: 720px) {
    .toasts {
      bottom: calc(84px + env(safe-area-inset-bottom));
    }
  }
</style>
