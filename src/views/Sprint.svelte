<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import FontGallery from '../components/FontGallery.svelte'
  import Hanko from '../components/Hanko.svelte'
  import Icon from '../components/Icon.svelte'
  import KanaDetails from '../components/KanaDetails.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import Modal from '../components/Modal.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import { FONTS } from '../lib/data/fonts'
  import { displayRomaji, glyph, type Kana, type Script } from '../lib/data/kana'
  import { logPractice } from '../lib/study/actions'
  import { kanaForAnswer } from '../lib/study/answer'
  import { chooseOptions } from '../lib/study/distractors'
  import {
    PENALTY_MS,
    SPRINT_MS,
    bestSprint,
    judge,
    nextSprintKana,
    recordSprint,
    sprintPool,
  } from '../lib/study/sprint'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { navigate, route } from '../state/router.svelte'
  import { ui } from '../state/ui.svelte'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  const param = route.segments[1]
  const script: Script | undefined =
    param === 'katakana' ? 'katakana' : param === 'hiragana' ? 'hiragana' : undefined
  /** Phones and tablets answer with buttons instead of typing. */
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

  let phase = $state<'ready' | 'running' | 'done'>('ready')
  let pool: Kana[] = []
  let current = $state<Kana | undefined>()
  let options = $state<Kana[]>([])
  let input = $state('')
  let score = $state(0)
  let mistakes = $state(0)
  /** What went wrong this sprint, in order: the kana and the romaji that was typed or chosen. */
  let missed = $state<{ kana: Kana; typed: string }[]>([])
  let selected = $state<Kana | undefined>()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)
  let fullEl = $state<HTMLDivElement>()
  let endsAt = 0
  let left = $state(SPRINT_MS)
  let reveal = $state<string | undefined>()
  let record = $state(false)
  let previousBest = $state(0)
  let shownAt = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let inputEl = $state<HTMLInputElement>()

  onDestroy(() => {
    clearInterval(timer)
    ui.focus = false
  })

  async function start() {
    if (!script) return
    pool = sprintPool(store.data, script)
    previousBest = bestSprint(store.data, script)
    await loadFontWithin(settings().font)
    score = 0
    mistakes = 0
    missed = []
    selected = undefined
    record = false
    endsAt = performance.now() + SPRINT_MS
    left = SPRINT_MS
    phase = 'running'
    ui.focus = true
    show(nextSprintKana(pool))
    timer = setInterval(() => {
      left = Math.max(0, endsAt - performance.now())
      if (left === 0) finish()
    }, 100)
  }

  function show(k: Kana) {
    current = k
    input = ''
    shownAt = performance.now()
    if (touch) options = chooseOptions(k, pool, 4)
    void tick().then(() => inputEl?.focus())
  }

  function answer(correct: boolean, answered?: Kana, typed = '') {
    if (!current || !script) return
    logPractice(store.data, {
      mode: 'sprint',
      deck: script,
      id: current.id,
      correct,
      ms: performance.now() - shownAt,
      ...(answered && !correct ? { answer: answered.id } : {}),
    })
    feedback(correct ? 3 : 1)
    if (correct) {
      score++
      show(nextSprintKana(pool, current))
    } else {
      mistakes++
      missed.push({ kana: current, typed })
      endsAt -= PENALTY_MS
      reveal = displayRomaji(current, settings().romaji)
      const wrong = current
      setTimeout(() => {
        reveal = undefined
        if (phase === 'running' && current === wrong) show(nextSprintKana(pool, wrong))
      }, 800)
    }
  }

  function onInput() {
    if (!current || reveal) return
    const verdict = judge(input, current)
    if (verdict === 'correct') answer(true)
    else if (verdict === 'wrong') answer(false, kanaForAnswer(input, pool), input.trim())
  }

  function finish() {
    if (phase !== 'running' || !script) return
    clearInterval(timer)
    phase = 'done'
    ui.focus = false
    record = score > 0 && recordSprint(store.data, script, score)
    void audio.playSfx(record ? 'milestone' : 'complete')
  }

  function select(k: Kana) {
    selected = k
    void audio.playVoice(k.id)
    void tick().then(() => fullEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  function onKeydown(e: KeyboardEvent) {
    // Escape and Enter belong to an open dialog.
    if (strokesOpen || fontsOpen) return
    if (e.key === 'Escape' && selected) {
      selected = undefined
    } else if (e.key === 'Escape') {
      clearInterval(timer)
      navigate('/sprint')
    } else if (phase !== 'running' && e.key === 'Enter' && script) {
      e.preventDefault()
      void start()
    }
  }

  const best = $derived({
    hiragana: bestSprint(store.data, 'hiragana'),
    katakana: bestSprint(store.data, 'katakana'),
  })
</script>

<svelte:window onkeydown={onKeydown} />

{#if !script}
  <header class="page-head">
    <p class="eyebrow light">{t('sprint.eyebrow')}</p>
    <h1>{t('sprint.heading')}</h1>
    <p class="lead">{t('sprint.lead')}</p>
  </header>
  <div class="decks">
    {#each ['hiragana', 'katakana'] as const as sc (sc)}
      <a class="deck panel" href="#/sprint/{sc}">
        <span class="art" lang="ja">{sc === 'hiragana' ? 'あ' : 'ア'}</span>
        <span>
          <strong>{sc === 'hiragana' ? t('common.hiragana') : t('common.katakana')}</strong>
          <span class="muted">{t('sprint.bestScore', { score: best[sc] })}</span>
        </span>
      </a>
    {/each}
  </div>
{:else}
  <div class="sprint">
    <div class="topbar panel">
      <button
        class="btn icon ghost"
        onclick={() => navigate('/sprint')}
        aria-label={t('common.leave')}
      >
        <Icon name="close" />
      </button>
      <strong>{t('sprint.title', { script: t(`common.${script}` as MessageKey) })}</strong>
      <span class="bar" style:--p={left / SPRINT_MS}></span>
      <span class="time" aria-label={t('sprint.secondsLeft')}>{Math.ceil(left / 1000)}s</span>
      <span class="score" aria-label={t('sprint.scoreLabel')}>{score}</span>
    </div>

    {#if phase === 'ready'}
      <section class="panel card" in:fly={{ y: 12 }}>
        <h2>{t('sprint.ready')}</h2>
        <p class="muted">{t('sprint.bestSoFar', { score: bestSprint(store.data, script) })}</p>
        <button class="btn primary" onclick={start}>{t('common.start')} <kbd>Enter</kbd></button>
      </section>
    {:else if phase === 'running' && current}
      {#key current.id + score + mistakes}
        <div class="question washi" in:fly={{ y: 10, duration: 160 }}>
          <KanaGlyph text={glyph(current, script)} font={settings().font} size="7rem" />
          {#if reveal}<span class="reveal">{reveal}</span>{/if}
        </div>
      {/key}
      {#if touch}
        <div class="options" role="group" aria-label={t('sprint.whichRomaji')}>
          {#each options as o (o.id)}
            <button
              class="btn option"
              disabled={!!reveal}
              onclick={() => answer(o.id === current?.id, o, displayRomaji(o, settings().romaji))}
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
          aria-label="Romaji"
          disabled={!!reveal}
        />
      {/if}
    {:else if phase === 'done'}
      <section class="panel card" in:fly={{ y: 12 }}>
        {#if record}<div class="seal">
            <Hanko size={72} stamp title={t('sprint.newRecordTitle')} />
          </div>{/if}
        <p class="eyebrow">{t('sprint.doneEyebrow')}</p>
        <h2>{t('sprint.doneKana', { score })}</h2>
        <p class="muted">
          {t('sprint.mistakes', { mistakes })} ·
          {record
            ? t('sprint.newRecord', { previous: previousBest })
            : t('sprint.bestScore', { score: bestSprint(store.data, script) })}
        </p>
        <div class="row">
          <button class="btn primary" onclick={start}>{t('common.again')} <kbd>Enter</kbd></button>
          <a class="btn" href="#/practice">{t('nav.practice')}</a>
        </div>
      </section>
      {#if missed.length}
        <section class="panel card" in:fly={{ y: 12, delay: 80 }}>
          <h3>{t('sprint.reviewHeading')}</h3>
          <p class="muted small">{t('sprint.reviewHint')}</p>
          <ul class="missed">
            {#each missed as m, i (i)}
              <li>
                <button
                  class="miss"
                  class:active={selected?.id === m.kana.id}
                  aria-pressed={selected?.id === m.kana.id}
                  aria-label={t('sprint.showCard', {
                    kana: glyph(m.kana, script),
                    romaji: displayRomaji(m.kana, settings().romaji),
                  })}
                  onclick={() =>
                    selected?.id === m.kana.id ? (selected = undefined) : select(m.kana)}
                >
                  <KanaGlyph text={glyph(m.kana, script)} font={settings().font} size="2.4rem" />
                </button>
                <span class="answers">
                  <span class="typed"
                    ><span class="label muted">{t('sprint.typed')}</span>
                    <span class="wrong">{m.typed || '—'}</span></span
                  >
                  <span class="expected"
                    ><span class="label muted">{t('sprint.expected')}</span>
                    <strong>{displayRomaji(m.kana, settings().romaji)}</strong></span
                  >
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      {#if selected}
        <div class="card full" bind:this={fullEl}>
          <KanaDetails
            kana={selected}
            onstrokes={() => (strokesOpen = true)}
            onfonts={() => (fontsOpen = true)}
            onclose={() => (selected = undefined)}
          />
        </div>
      {/if}
    {/if}
  </div>
{/if}

{#if selected}
  <Modal bind:open={strokesOpen} title={t('table.strokeOrder')}>
    <div class="strokes">
      {#if selected.hiragana}<StrokeOrder text={selected.hiragana} size={180} />{/if}
      <StrokeOrder text={selected.katakana} size={180} />
    </div>
  </Modal>
  <Modal bind:open={fontsOpen} title={t('table.fontGallery')} wide>
    <FontGallery
      text={selected.hiragana || selected.katakana}
      fonts={FONTS.map((f) => f.id)}
      current={settings().font}
    />
    {#if selected.hiragana}
      <div style="height: 1rem"></div>
      <FontGallery
        text={selected.katakana}
        fonts={FONTS.map((f) => f.id)}
        current={settings().font}
      />
    {/if}
  </Modal>
{/if}

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
    margin-bottom: 1rem;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .lead {
    max-width: 58ch;
  }

  .decks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .deck {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.2rem;
    color: var(--ink);
    text-decoration: none;
  }

  .deck > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .art {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    font-family: var(--font-kana);
    font-size: 2rem;
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }

  .sprint {
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

  .time,
  .score {
    font-variant-numeric: tabular-nums;
    font-weight: 650;
  }

  .score {
    min-width: 2.5ch;
    text-align: right;
    font-size: 1.3rem;
    font-family: var(--font-heading);
  }

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

  .card {
    position: relative;
    width: min(100%, 520px);
    padding: 1.5rem;
  }

  .seal {
    position: absolute;
    top: 1rem;
    right: 1.2rem;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }

  .card h3 {
    margin: 0;
  }

  .small {
    font-size: 0.9rem;
    margin: 0.2rem 0 0.8rem;
  }

  .missed {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .missed li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .miss {
    width: 3.6rem;
    height: 3.6rem;
    flex: none;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .miss:hover,
  .miss.active {
    border-color: var(--shu);
    background: color-mix(in srgb, var(--shu) 10%, transparent);
  }

  .answers {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .label {
    font-size: 0.75rem;
  }

  .wrong {
    font-weight: 650;
    color: var(--shu);
  }

  .full {
    padding: 0;
  }

  .strokes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
</style>
