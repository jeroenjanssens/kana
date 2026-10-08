<script lang="ts">
  import Modal from './Modal.svelte'

  let { open = $bindable(false) }: { open?: boolean } = $props()

  const SHORTCUTS: [string, string][] = [
    ['Space', 'Reveal the answer'],
    ['1 – 4', 'Grade: Again, Hard, Good, Easy'],
    ['Enter', 'Accept the suggested grade (typed answers)'],
    ['P', 'Play the pronunciation'],
    ['S', 'Show the stroke order'],
    ['F', 'Show the font gallery'],
    ['← / →', 'Previous / next card (in order)'],
    ['M', 'Mute or unmute sound effects'],
    ['Esc', 'Leave the session'],
    ['?', 'Show this list'],
  ]
</script>

<Modal bind:open title="Keyboard shortcuts">
  <dl class="shortcuts">
    {#each SHORTCUTS as [key, what] (key)}
      <dt><kbd>{key}</kbd></dt>
      <dd>{what}</dd>
    {/each}
  </dl>
</Modal>

<style>
  .shortcuts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.6rem 1.2rem;
    margin: 0;
  }

  dt {
    text-align: right;
  }

  dd {
    margin: 0;
    color: var(--ink-soft);
  }
</style>
