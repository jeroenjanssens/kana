<script lang="ts">
  import type { Word } from '../lib/data/words'
  import { wordSize } from '../lib/study/reading'
  import KanaGlyph from './KanaGlyph.svelte'

  /**
   * A word or a phrase in ink, sized to fit its container (a size container) on one line. A
   * phrase wraps between its words, never inside one, with or without spaces between them; it's
   * sized so its longest word fits, and no larger than `phraseMax`.
   */
  let {
    word,
    font,
    max,
    phraseMax = max,
    spaces = true,
  }: {
    word: Pick<Word, 'kana' | 'parts'>
    font: string
    max: string
    phraseMax?: string
    spaces?: boolean
  } = $props()

  const phrase = $derived(word.parts.length > 1)
  const longest = $derived(word.parts.reduce((a, b) => ([...b].length > [...a].length ? b : a), ''))
  const size = $derived(wordSize(longest, phrase ? phraseMax : max))
</script>

{#if phrase}
  <span class="phrase" class:spaces style:font-size={size} lang="ja">
    {#each word.parts as part, i (i)}<KanaGlyph text={part} {font} size="1em" />{/each}
  </span>
{:else}
  <KanaGlyph text={word.kana} {font} {size} />
{/if}

<style>
  .phrase {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    row-gap: 0.1em;
    max-width: 100%;
  }

  .phrase.spaces {
    column-gap: 0.35em;
  }
</style>
