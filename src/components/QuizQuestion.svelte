<script lang="ts">
  import { tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import { displayRomaji, glyph, type Kana } from '../lib/data/kana'
  import { kanaForAnswer } from '../lib/study/answer'
  import type { Question } from '../lib/study/scripts'
  import { answerPool, judge } from '../lib/study/sprint'
  import { settings } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'
  import KanaGlyph from './KanaGlyph.svelte'

  /**
   * A timed kana question (sprints and races): the kana on paper, then the romaji, typed (judged
   * as you type, no Enter needed) or, on touch screens, chosen from the options.
   */
  let {
    question,
    round,
    font,
    reveal,
    touch,
    options = [],
    onanswer,
  }: {
    question: Question
    /** The question card slides in again whenever this changes. */
    round: number
    font: string
    /** The right answer, shown after a wrong one. */
    reveal?: string
    touch: boolean
    options?: Kana[]
    /** `answered` is the kana that was typed or chosen instead, if there is one. */
    onanswer: (correct: boolean, answered?: Kana, typed?: string) => void
  } = $props()

  let input = $state('')
  let inputEl = $state<HTMLInputElement>()

  // A fresh, focused answer box for every question (what was typed stays while it's corrected).
  $effect.pre(() => {
    void question
    input = ''
    void tick().then(() => inputEl?.focus())
  })

  function onInput() {
    if (reveal) return
    const verdict = judge(input, question.kana)
    if (verdict === 'correct') onanswer(true)
    else if (verdict === 'wrong') {
      onanswer(false, kanaForAnswer(input, answerPool(question.script)), input.trim())
    }
  }
</script>

{#key round}
  <div class="question washi" in:fly={{ y: 10, duration: 160 }}>
    <KanaGlyph text={glyph(question.kana, question.script)} {font} size="7rem" />
    {#if reveal}<span class="reveal">{reveal}</span>{/if}
  </div>
{/key}
{#if touch}
  <div class="options" role="group" aria-label={t('sprint.whichRomaji')}>
    {#each options as o (o.id)}
      <button
        class="btn option"
        disabled={!!reveal}
        onclick={() => onanswer(o.id === question.kana.id, o, displayRomaji(o, settings().romaji))}
        >{displayRomaji(o, settings().romaji)}</button
      >
    {/each}
  </div>
{:else}
  <input
    bind:this={inputEl}
    bind:value={input}
    oninput={onInput}
    class="answer"
    type="text"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    aria-label={t('common.romajiAnswer')}
    disabled={!!reveal}
  />
{/if}

<style>
  .question {
    position: relative;
    width: min(70vw, 260px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 20px;
    box-shadow: var(--shadow);
  }

  .reveal {
    position: absolute;
    bottom: 0.8rem;
    font-family: var(--font-heading);
    font-size: 1.6rem;
    color: var(--shu);
  }

  .answer {
    width: min(80vw, 280px);
    text-align: center;
    font-size: 1.6rem;
    border-radius: 999px;
    box-shadow: var(--shadow-soft);
  }

  .options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
    width: min(90vw, 360px);
  }

  .option {
    min-height: 60px;
    font-size: 1.3rem;
  }
</style>
