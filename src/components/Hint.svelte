<script lang="ts">
  import { hintParts } from '../lib/data/mnemonics'

  /** A memory hint, with the *sound* emphasised. */
  let { text }: { text: string } = $props()
</script>

<span class="hint"
  >{#each hintParts(text) as part, i (i)}{#if part.em}<em>{part.text}</em
      >{:else}{part.text}{/if}{/each}</span
>

<style>
  em {
    font-style: normal;
    font-weight: 700;
    color: var(--shu);
  }
</style>
