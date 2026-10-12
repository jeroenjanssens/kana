<script lang="ts">
  import { fontFamily } from '../lib/data/fonts'
  import { hintParagraphs, hintParts } from '../lib/data/mnemonics'
  import { loadFont } from '../lib/ui/fontLoader'

  /** A memory hint, with the *sound* emphasised and a paragraph per line break. */
  let { text }: { text: string } = $props()

  const TEXTBOOK = 'klee-one'

  $effect(() => {
    if (text.includes('{')) loadFont(TEXTBOOK)
  })
</script>

<span class="hint"
  >{#each hintParagraphs(text) as para, p (p)}<span class="para"
      >{#each hintParts(para) as part, i (i)}{#if part.em}<em>{part.text}</em
          >{:else if part.textbook}<span
            class="textbook"
            lang="ja"
            style:font-family={fontFamily(TEXTBOOK)}>{part.text}</span
          >{:else}{part.text}{/if}{/each}</span
    >{/each}</span
>

<style>
  .para {
    display: block;
  }

  .para + .para {
    margin-top: 0.45em;
  }

  em {
    font-style: normal;
    font-weight: 700;
    color: var(--shu);
  }

  .textbook {
    font-size: 1.15em;
  }
</style>
