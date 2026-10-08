<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import PaperCard from '../components/PaperCard.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { randomFontId } from '../lib/data/fonts'
  import { segment } from '../lib/data/kana'
  import { words, type Word } from '../lib/data/words'
  import { logPractice, markNoteSeen, recordWord } from '../lib/study/actions'
  import { checkWord } from '../lib/study/answer'
  import {
    missingKana,
    notesFor,
    practiceOrder,
    unlockedWords,
    type ReadingNote,
  } from '../lib/study/reading'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, settings, store } from '../state/app.svelte'
  import { nextPhoto, ui } from '../state/ui.svelte'

  const ROUND = 15

  const unlocked = $derived(unlockedWords(store.data))
  const locked = $derived(
    words
      .filter((w) => !unlocked.includes(w))
      .map((w) => ({ w, missing: missingKana(store.data, w) }))
      .sort((a, b) => a.missing.length - b.missing.length),
  )
  const s = $derived(settings())

  let phase = $state<'overview' | 'card' | 'done'>('overview')
  let queue = $state<Word[]>([])
  let index = $state(0)
  let flipped = $state(false)
  let input = $state('')
  let verdict = $state<boolean | undefined>()
  let notes = $state<ReadingNote[]>([])
  let font = $state(settings().font)
  /** One voice per word card (matters for the "random" setting). */
  let voice: VoiceId = audio.pickVoice()
  let tilt = $state(0)
  let score = $state(0)
  let startedAt = 0
  let inputEl = $state<HTMLInputElement>()

  onDestroy(() => (ui.focus = false))

  const current = $derived(queue[index])
  const typed = $derived(s.answerStyle === 'typed')

  async function start() {
    queue = practiceOrder(store.data, unlocked).slice(0, ROUND)
    if (!queue.length) return
    score = 0
    ui.focus = true
    await show(0)
  }

  async function show(i: number) {
    const f = s.fontMode === 'random' ? randomFontId(s.randomFonts, font) : s.font
    await loadFontWithin(f)
    font = f
    voice = audio.pickVoice()
    index = i
    flipped = false
    verdict = undefined
    input = ''
    notes = []
    tilt = (Math.random() - 0.5) * 1.2
    phase = 'card'
    startedAt = performance.now()
    setTimeout(() => inputEl?.focus(), 50)
  }

  function reveal() {
    if (!current || flipped) return
    flipped = true
    void audio.playSfx('flip')
    const word = current
    if (s.autoplay) setTimeout(() => current === word && audio.playWord(word.index, voice), 280)
    notes = notesFor(current).filter((n) => markNoteSeen(store.data, n.id))
  }

  function submit() {
    if (!current || flipped) return
    verdict = checkWord(current, input)
    reveal()
  }

  function answer(correct: boolean) {
    if (!current) return
    recordWord(store.data, current.kana, correct)
    logPractice(store.data, {
      mode: 'reading',
      id: current.kana,
      correct,
      ms: performance.now() - startedAt,
    })
    if (correct) {
      score++
    }
    // Right or wrong only: right sounds like Good, wrong like Again.
    void audio.playGrade(correct ? 3 : 1)
    if ((index + 1) % s.photoEvery === 0) nextPhoto()
    if (index + 1 >= queue.length) {
      phase = 'done'
      ui.focus = false
      void audio.playSfx('complete')
    } else {
      void show(index + 1)
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (phase !== 'card') return
    const inInput = (e.target as HTMLElement).tagName === 'INPUT'
    if (e.key === 'Escape') {
      phase = 'overview'
      ui.focus = false
      return
    }
    if (inInput && !flipped) return
    if ((e.key === ' ' || e.key === 'Enter') && !flipped && !typed) {
      e.preventDefault()
      reveal()
    } else if (flipped && e.key === 'Enter') {
      e.preventDefault()
      answer(verdict ?? true)
    } else if (flipped && (e.key === 'p' || e.key === 'P')) {
      void audio.playWord(current.index, voice)
    } else if (flipped && !typed && e.key === '1') answer(false)
    else if (flipped && !typed && e.key === '2') answer(true)
  }

  const parts = $derived(current ? segment(current.kana) : [])
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'overview'}
  <header class="page-head">
    <p class="eyebrow light">読む練習 · Reading</p>
    <h1>Reading practice</h1>
    <p class="lead">
      Real Japanese words, built only from kana you already know. A word unlocks when every kana in
      it is at least "young" in your decks.
    </p>
  </header>

  <section class="panel block start">
    <div>
      <h2>{unlocked.length} of {words.length} words unlocked</h2>
      <p class="muted">
        {unlocked.length
          ? `Practise a round of ${Math.min(ROUND, unlocked.length)} words.`
          : 'Learn the first rows (あ い う え お, か き く け こ…) to unlock your first words.'}
      </p>
    </div>
    <button class="btn primary" disabled={!unlocked.length} onclick={start}>Start reading</button>
  </section>

  {#if unlocked.length}
    <section class="panel block">
      <h2>Unlocked</h2>
      <ul class="chips">
        {#each unlocked as w (w.kana)}
          {@const p = store.data.words[w.kana]}
          <li title="{w.romaji} — {w.meaning}" class:practised={p && p.correct > 0}>
            <span lang="ja">{w.kana}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if locked.length}
    <section class="panel block">
      <h2>Next to unlock</h2>
      <ul class="next">
        {#each locked.slice(0, 8) as { w, missing } (w.kana)}
          <li>
            <span class="word" lang="ja">{w.kana}</span>
            <span class="muted">needs</span>
            <span lang="ja" class="missing">
              {missing.map((k) => (w.script === 'katakana' ? k.katakana : k.hiragana)).join(' ')}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{:else if phase === 'card' && current}
  <div class="reading">
    <div class="topbar panel">
      <button
        class="btn icon ghost"
        onclick={() => ((phase = 'overview'), (ui.focus = false))}
        aria-label="Leave (Esc)"
      >
        <Icon name="close" />
      </button>
      <strong>Reading</strong>
      <span class="bar" style:--p={(index + (flipped ? 1 : 0)) / queue.length}></span>
      <span class="muted">{index + 1} / {queue.length}</span>
    </div>

    {#key index}
      <div in:fly={{ y: 20, duration: 380 }}>
        <PaperCard
          {flipped}
          {tilt}
          label="Word card{flipped ? `, ${current.romaji}` : ''}"
          onflip={() => (typed ? inputEl?.focus() : reveal())}
        >
          {#snippet front()}
            <KanaGlyph
              text={current.kana}
              {font}
              size={current.kana.length > 4 ? '3.6rem' : '5rem'}
            />
            <span class="muted hint"
              >{current.script === 'katakana' ? 'Katakana' : 'Hiragana'} word</span
            >
          {/snippet}
          {#snippet back()}
            <KanaGlyph text={current.kana} {font} size="2.4rem" />
            {#if verdict !== undefined}
              <p class="verdict" class:wrong={!verdict}>
                {verdict ? 'Correct' : `You typed “${input}”`}
              </p>
            {/if}
            <p class="romaji">{current.romaji}</p>
            <p class="meaning">{current.meaning}</p>
            <button
              class="btn small listen"
              onclick={(e) => {
                e.stopPropagation()
                audio.playWord(current.index, voice)
              }}
              aria-label="Play the word (P)"><Icon name="play" size={14} filled /> Listen</button
            >
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class="parts" onclick={(e) => e.stopPropagation()}>
              {#each parts as p, i (i)}
                {#if p.kana}
                  <button
                    class="part"
                    onclick={() => p.kana && audio.playVoice(p.kana.id, voice)}
                    title={p.kana.romaji}
                  >
                    <span lang="ja">{p.text}</span>
                    <small>{p.kana.romaji}</small>
                  </button>
                {:else}
                  <span class="part mark"
                    ><span lang="ja">{p.text}</span><small
                      >{p.text === 'ー'
                        ? 'long'
                        : p.text === 'っ' || p.text === 'ッ'
                          ? 'pause'
                          : ''}</small
                    ></span
                  >
                {/if}
              {/each}
            </div>
          {/snippet}
        </PaperCard>
      </div>
    {/key}

    {#each notes as n (n.id)}
      <aside class="note panel" in:fly={{ y: 8 }}>
        <p class="eyebrow">New rule</p>
        <h3>{n.title}</h3>
        <p>{n.body}</p>
        <p class="example" lang="ja">{n.example}</p>
      </aside>
    {/each}

    <div class="controls">
      {#if typed && !flipped}
        <form
          class="typed"
          onsubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            bind:this={inputEl}
            bind:value={input}
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="Type how it reads…"
            aria-label="Reading in romaji"
          />
          <button class="btn primary" type="submit">Check</button>
        </form>
      {:else if !flipped}
        <button class="btn primary" onclick={reveal}>Show reading <kbd>Space</kbd></button>
      {:else if typed}
        <button class="btn primary" onclick={() => answer(verdict ?? false)}
          >Next <kbd>Enter</kbd></button
        >
      {:else}
        <div class="row">
          <button class="btn missed" onclick={() => answer(false)}
            >Couldn't read it <kbd>1</kbd></button
          >
          <button class="btn got" onclick={() => answer(true)}>Read it <kbd>2</kbd></button>
        </div>
      {/if}
    </div>
  </div>
{:else if phase === 'done'}
  <section class="panel block done">
    <p class="eyebrow">よくできました · Well read</p>
    <h2>{score} / {queue.length} words read correctly</h2>
    <div class="row">
      <button class="btn primary" onclick={start}>Another round</button>
      <button class="btn" onclick={() => (phase = 'overview')}>Overview</button>
    </div>
  </section>
{/if}

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .lead {
    max-width: 60ch;
  }

  .block {
    padding: 1.2rem 1.4rem;
    margin-bottom: 1rem;
  }

  .block h2 {
    font-size: 1.15rem;
  }

  .start {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .start p {
    margin: 0;
  }

  .chips {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips li {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-family: var(--font-kana);
    font-size: 1.05rem;
  }

  .chips li.practised {
    background: color-mix(in srgb, var(--level-young) 30%, transparent);
  }

  .next {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.35rem;
  }

  .next li {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .word,
  .missing {
    font-family: var(--font-kana);
    font-size: 1.2rem;
  }

  .missing {
    color: var(--shu);
  }

  .reading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .topbar {
    width: min(100%, 720px);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 1rem 0.35rem 0.35rem;
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

  .hint {
    font-size: 0.8rem;
    margin-top: 1rem;
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 2.6rem;
    margin: 0.4rem 0 0;
    line-height: 1.1;
  }

  .meaning {
    margin: 0.2rem 0 1rem;
    color: var(--ink-soft);
    font-size: 1.05rem;
  }

  .verdict {
    margin: 0.5rem 0 0;
    font-weight: 600;
    color: var(--matcha);
  }

  .verdict.wrong {
    color: var(--shu);
  }

  .listen {
    margin-bottom: 0.9rem;
  }

  .parts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: center;
  }

  .part {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--paper) 60%, transparent);
    font-family: var(--font-kana);
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--ink);
  }

  .part:disabled {
    cursor: default;
  }

  .part small {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    color: var(--ink-faint);
  }

  .part.mark {
    border-style: dashed;
    cursor: default;
  }

  .note {
    width: min(100%, 520px);
    padding: 1rem 1.2rem;
    border-left: 4px solid var(--shu);
  }

  .note h3 {
    margin: 0.2rem 0 0.4rem;
  }

  .note p {
    margin: 0 0 0.4rem;
    font-size: 0.9rem;
  }

  .example {
    font-family: var(--font-kana);
    color: var(--ink-soft);
  }

  .controls {
    min-height: 60px;
  }

  .typed {
    display: flex;
    gap: 0.5rem;
    width: min(92vw, 420px);
  }

  .typed input {
    flex: 1;
    text-align: center;
    font-size: 1.1rem;
    border-radius: 999px;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .missed {
    border-bottom: 3px solid var(--shu);
  }

  .got {
    border-bottom: 3px solid var(--level-young);
  }

  .done {
    max-width: 560px;
    margin: 0 auto;
  }
</style>
