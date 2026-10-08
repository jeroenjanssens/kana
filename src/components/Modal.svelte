<script lang="ts">
  import type { Snippet } from 'svelte'
  import { t } from '../state/i18n.svelte'

  let {
    open = $bindable(false),
    title,
    wide = false,
    children,
  }: { open?: boolean; title: string; wide?: boolean; children: Snippet } = $props()

  let dialog = $state<HTMLDialogElement>()

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  class="modal washi"
  class:wide
  onclose={() => (open = false)}
  onclick={(e) => {
    if (e.target === dialog) open = false
  }}
  aria-label={title}
>
  {#if open}
    <header>
      <h2>{title}</h2>
      <button class="btn icon ghost" onclick={() => (open = false)} aria-label={t('common.close')}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          ><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" fill="none" /></svg
        >
      </button>
    </header>
    <div class="content">
      {@render children()}
    </div>
  {/if}
</dialog>

<style>
  .modal {
    border: 0;
    padding: 0;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    width: min(520px, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    color: var(--ink);
  }

  .modal.wide {
    width: min(920px, calc(100vw - 2rem));
  }

  .modal::backdrop {
    background: rgb(20 15 8 / 0.45);
    backdrop-filter: blur(3px);
  }

  .modal[open] {
    animation: rise 0.3s var(--ease);
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1rem 0 1.5rem;
  }

  h2 {
    margin: 0;
  }

  .content {
    padding: 1rem 1.5rem 1.5rem;
    overflow: auto;
  }
</style>
