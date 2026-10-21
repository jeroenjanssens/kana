<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import Hanko from '../components/Hanko.svelte'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MissedKana from '../components/MissedKana.svelte'
  import ScriptPicker from '../components/ScriptPicker.svelte'
  import { nextCardFont } from '../lib/data/fonts'
  import { displayRomaji, glyph, type Kana } from '../lib/data/kana'
  import { logPractice } from '../lib/study/actions'
  import { kanaForAnswer } from '../lib/study/answer'
  import { chooseOptions } from '../lib/study/distractors'
  import { SCRIPT_CHOICES, kanaOf, type Question, type ScriptChoice } from '../lib/study/scripts'
  import {
    PENALTY_MS,
    SPRINT_MINUTES,
    answerPool,
    bestSprint,
    formatClock,
    judge,
    nextQuestion,
    recordSprint,
    sprintLength,
    sprintQuestions,
  } from '../lib/study/sprint'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { route } from '../state/router.svelte'
  import { ui } from '../state/ui.svelte'
  import { lang, t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  // Old links (#/sprint/katakana) choose the script.
  const param = route.segments[1] as ScriptChoice | undefined
  if (param && SCRIPT_CHOICES.includes(param)) settings().sprintScript = param
  const s = settings()
  /** Phones and tablets answer with buttons instead of typing. */
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

  let phase = $state<'setup' | 'running' | 'done'>('setup')
  /** The script choice and length of the sprint being run (the settings may change after). */
  let choice = $state<ScriptChoice>(s.sprintScript)
  let minutes = $state(1)
  let pool: Question[] = []
  let current = $state<Question | undefined>()
  let font = $state(s.font)
  let options = $state<Kana[]>([])
  let input = $state('')
  let score = $state(0)
  let mistakes = $state(0)
  /** What went wrong this sprint, in order: the kana and the romaji that was typed or chosen. */
  let missed = $state<{ kana: Kana; text: string; typed: string }[]>([])
  let review = $state<MissedKana>()
  let endsAt = 0
  let left = $state(0)
  let reveal = $state<string | undefined>()
  let record = $state(false)
  let previousBest = $state(0)
  let shownAt = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let inputEl = $state<HTMLInputElement>()

  const chosenMinutes = $derived(sprintLength(s.sprintMinutes))
  const best = $derived(bestSprint(store.data, s.sprintScript, chosenMinutes))

  onDestroy(() => {
    clearInterval(timer)
    ui.focus = false
  })

  async function start() {
    choice = s.sprintScript
    minutes = chosenMinutes
    pool = sprintQuestions(store.data, choice)
    previousBest = bestSprint(store.data, choice, minutes)
    // Load every font up front: the clock can't wait for one to download mid-sprint.
    await Promise.all((s.fontMode === 'random' ? s.randomFonts : [s.font]).map(loadFontWithin))
    score = 0
    mistakes = 0
    missed = []
    record = false
    endsAt = performance.now() + minutes * 60_000
    left = minutes * 60_000
    phase = 'running'
    ui.focus = true
    show(nextQuestion(pool))
    timer = setInterval(() => {
      left = Math.max(0, endsAt - performance.now())
      if (left === 0) finish()
    }, 100)
  }

  function show(q: Question) {
    current = q
    font = nextCardFont(settings(), font)
    input = ''
    shownAt = performance.now()
    if (touch) options = chooseOptions(q.kana, kanaOf(pool), 4)
    void tick().then(() => inputEl?.focus())
  }

  function answer(correct: boolean, answered?: Kana, typed = '') {
    if (!current) return
    logPractice(store.data, {
      mode: 'sprint',
      deck: current.script,
      id: current.kana.id,
      correct,
      ms: performance.now() - shownAt,
      ...(answered && !correct ? { answer: answered.id } : {}),
    })
    feedback(correct ? 3 : 1)
    if (correct) {
      score++
      show(nextQuestion(pool, current))
    } else {
      mistakes++
      missed.push({ kana: current.kana, text: glyph(current.kana, current.script), typed })
      endsAt -= PENALTY_MS
      reveal = displayRomaji(current.kana, settings().romaji)
      const wrong = current
      setTimeout(() => {
        reveal = undefined
        if (phase === 'running' && current === wrong) show(nextQuestion(pool, wrong))
      }, 800)
    }
  }

  function onInput() {
    if (!current || reveal) return
    const verdict = judge(input, current.kana)
    if (verdict === 'correct') answer(true)
    else if (verdict === 'wrong') {
      answer(false, kanaForAnswer(input, answerPool(current.script)), input.trim())
    }
  }

  function finish() {
    if (phase !== 'running') return
    clearInterval(timer)
    phase = 'done'
    ui.focus = false
    record = score > 0 && recordSprint(store.data, choice, minutes, score)
    void audio.playSfx(record ? 'milestone' : 'complete')
  }

  function leave() {
    clearInterval(timer)
    phase = 'setup'
    ui.focus = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (review?.handleKey(e)) return
    if (e.key === 'Escape' && phase !== 'setup') leave()
    else if (phase !== 'running' && e.key === 'Enter') {
      e.preventDefault()
      void start()
    }
  }

  function scriptLabel(c: ScriptChoice): string {
    return c === 'both' ? t('common.hiraganaAndKatakana') : t(`common.${c}` as MessageKey)
  }

  const perMinute = $derived((score / minutes).toLocaleString(lang(), { maximumFractionDigits: 1 }))
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'setup'}
  <header class="page-head">
    <p class="eyebrow light">{t('sprint.eyebrow')}</p>
    <h1>{t('sprint.heading')}</h1>
    <p class="lead">{t('sprint.lead')}</p>
  </header>
  <section class="panel setup" in:fly={{ y: 12 }}>
    <div class="field">
      <span class="label">{t('common.scriptLabel')}</span>
      <ScriptPicker bind:value={s.sprintScript} />
    </div>
    <div class="field">
      <span class="label">{t('sprint.lengthLabel')}</span>
      <div class="segmented" role="group" aria-label={t('sprint.lengthLabel')}>
        {#each SPRINT_MINUTES as m (m)}
          <button aria-pressed={chosenMinutes === m} onclick={() => (s.sprintMinutes = m)}
            >{t('sprint.minutes', { n: m })}</button
          >
        {/each}
      </div>
    </div>
    <div class="go">
      <span class="muted">{t('sprint.bestScore', { score: best })}</span>
      <button class="btn primary" onclick={start}>{t('common.start')} <kbd>Enter</kbd></button>
    </div>
  </section>
{:else}
  <div class="sprint">
    <div class="topbar panel">
      <button class="btn icon ghost" onclick={leave} aria-label={t('common.leave')}>
        <Icon name="close" />
      </button>
      <strong>{t('sprint.title', { script: scriptLabel(choice) })}</strong>
      <span class="bar" style:--p={left / (minutes * 60_000)}></span>
      <span class="time" aria-label={t('sprint.timeLeft')}
        >{formatClock(Math.ceil(left / 1000))}</span
      >
      <span class="score" aria-label={t('sprint.scoreLabel')}>{score}</span>
    </div>

    {#if phase === 'running' && current}
      {#key current.script + current.kana.id + score + mistakes}
        <div class="question washi" in:fly={{ y: 10, duration: 160 }}>
          <KanaGlyph text={glyph(current.kana, current.script)} {font} size="7rem" />
          {#if reveal}<span class="reveal">{reveal}</span>{/if}
        </div>
      {/key}
      {#if touch}
        <div class="options" role="group" aria-label={t('sprint.whichRomaji')}>
          {#each options as o (o.id)}
            <button
              class="btn option"
              disabled={!!reveal}
              onclick={() =>
                answer(o.id === current?.kana.id, o, displayRomaji(o, settings().romaji))}
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
        <h2>
          {minutes === 1
            ? t('sprint.doneKanaOne', { score })
            : t('sprint.doneKana', { score, minutes })}
        </h2>
        <p class="muted">
          {#if minutes > 1}{t('sprint.perMinute', { rate: perMinute })} ·{/if}
          {t('sprint.mistakes', { mistakes })} ·
          {record
            ? t('sprint.newRecord', { previous: previousBest })
            : t('sprint.bestScore', { score: bestSprint(store.data, choice, minutes) })}
        </p>
        <div class="row">
          <button class="btn primary" onclick={start}>{t('common.again')} <kbd>Enter</kbd></button>
          <button class="btn" onclick={leave}>{t('sprint.change')}</button>
          <a class="btn" href="#/practice">{t('nav.practice')}</a>
        </div>
      </section>
      <MissedKana bind:this={review} {missed} />
    {/if}
  </div>
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

  .setup {
    width: min(100%, 560px);
    padding: 1.25rem 1.4rem;
    display: grid;
    gap: 1rem;
  }

  .field {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }

  .label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-soft);
  }

  .go {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
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
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
