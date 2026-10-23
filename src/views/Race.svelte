<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import Hanko from '../components/Hanko.svelte'
  import SessionTopbar from '../components/SessionTopbar.svelte'
  import QuizQuestion from '../components/QuizQuestion.svelte'
  import MissedKana from '../components/MissedKana.svelte'
  import RowPicker from '../components/RowPicker.svelte'
  import ScriptPicker from '../components/ScriptPicker.svelte'
  import { nextCardFont } from '../lib/data/fonts'
  import { displayRomaji, glyph, type Kana } from '../lib/data/kana'
  import { deckKana } from '../lib/srs/queue'
  import type { RaceResult } from '../lib/storage/schema'
  import { logPractice } from '../lib/study/actions'
  import { chooseOptions } from '../lib/study/distractors'
  import {
    RACE_KANA,
    bestRace,
    formatRaceTime,
    raceKey,
    raceOrder,
    raceQuestions,
    recordRace,
  } from '../lib/study/race'
  import { rowOptions } from '../lib/study/rows'
  import { kanaOf, type Question, type ScriptChoice } from '../lib/study/scripts'
  import { PENALTY_MS, formatClock } from '../lib/study/sprint'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { ui } from '../state/ui.svelte'
  import { lang, t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'
  import { timers } from '../lib/ui/timers'

  const s = settings()
  /** Phones and tablets answer with buttons instead of typing. */
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

  let phase = $state<'setup' | 'running' | 'done'>('setup')
  /** The script choice of the race being run (the setting may change after). */
  let choice = $state<ScriptChoice>(s.raceScript)
  /** The questions of this race, in the order they're asked. */
  let questions = $state.raw<Question[]>([])
  let index = $state(0)
  let current = $state.raw<Question | undefined>()
  let font = $state(s.font)
  let options = $state<Kana[]>([])
  let mistakes = $state(0)
  /** What went wrong this race, in order, with what was typed or chosen. */
  let missed = $state.raw<{ question: Question; text: string; typed: string }[]>([])
  let review = $state<MissedKana>()
  let startedAt = 0
  let penalty = 0
  /** Time so far, penalties included; the finish time once the race is done. */
  let elapsed = $state(0)
  let reveal = $state<string | undefined>()
  let previous = $state<RaceResult | undefined>()
  let record = $state(false)
  let shownAt = 0
  let timer: ReturnType<typeof setInterval> | undefined

  const setup = $derived({ script: s.raceScript, kana: s.raceKana, rows: s.raceRows })
  const chosen = $derived(raceQuestions(store.data, setup, s.groups))
  // Katakana has every row (the extended ones only exist there), so it gives the rows for both.
  const rows = $derived(
    rowOptions(deckKana(s.raceScript === 'hiragana' ? 'hiragana' : 'katakana', s.groups)),
  )
  const chosenBest = $derived(chosen.length ? bestRace(store.data, raceKey(chosen)) : undefined)

  const later = timers()
  onDestroy(() => {
    clearInterval(timer)
    later.cancel()
    ui.focus = false
  })

  function startFromSetup() {
    choice = s.raceScript
    void start(chosen)
  }

  /** Start a race through these questions: the chosen ones, the same again, or the missed ones. */
  async function start(list: readonly Question[]) {
    if (!list.length) return
    questions = raceOrder(list, s.raceShuffle)
    // Load every font up front: the clock can't wait for one to download mid-race.
    await Promise.all((s.fontMode === 'random' ? s.randomFonts : [s.font]).map(loadFontWithin))
    index = 0
    mistakes = 0
    missed = []
    record = false
    previous = undefined
    penalty = 0
    elapsed = 0
    startedAt = performance.now()
    phase = 'running'
    ui.focus = true
    show(questions[0])
    timer = setInterval(() => (elapsed = performance.now() - startedAt + penalty), 100)
  }

  function show(q: Question) {
    current = q
    font = nextCardFont(settings(), font)
    shownAt = performance.now()
    if (touch) {
      // A short race (say, the missed ones) borrows wrong answers from the whole script.
      const own = kanaOf(questions)
      options = chooseOptions(q.kana, own.length >= 4 ? own : deckKana(q.script, s.groups), 4)
    }
  }

  function next() {
    index++
    if (index < questions.length) show(questions[index])
    else finish()
  }

  function answer(correct: boolean, answered?: Kana, typed = '') {
    if (!current || reveal) return
    logPractice(store.data, {
      mode: 'race',
      deck: current.script,
      id: current.kana.id,
      correct,
      ms: performance.now() - shownAt,
      ...(answered && !correct ? { answer: answered.id } : {}),
    })
    feedback(correct ? 3 : 1)
    const last = index === questions.length - 1
    if (!correct) {
      mistakes++
      missed = [...missed, { question: current, text: glyph(current.kana, current.script), typed }]
      penalty += PENALTY_MS
    }
    // The clock stops at the last answer, not after its correction has been shown.
    if (last) stopClock()
    if (correct) return next()
    reveal = displayRomaji(current.kana, settings().romaji)
    const wrong = current
    later.after(800, () => {
      reveal = undefined
      if (phase === 'running' && current === wrong) next()
    })
  }

  function stopClock() {
    clearInterval(timer)
    timer = undefined
    elapsed = performance.now() - startedAt + penalty
  }

  function finish() {
    if (phase !== 'running') return
    if (timer) stopClock()
    phase = 'done'
    ui.focus = false
    const result = recordRace(store.data, raceKey(questions), elapsed, mistakes)
    previous = result.previous
    record = result.record
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
      if (phase === 'done') void start(questions)
      else startFromSetup()
    }
  }

  function scriptLabel(c: ScriptChoice): string {
    return c === 'both' ? t('common.hiraganaAndKatakana') : t(`common.${c}` as MessageKey)
  }

  const empty = $derived(
    s.raceKana === 'rows'
      ? t('race.emptyRows')
      : s.raceKana === 'mastered'
        ? t('race.emptyMastered')
        : t('race.emptySeen'),
  )
  const perKana = $derived(
    (elapsed / 1000 / Math.max(1, questions.length)).toLocaleString(lang(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  )
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'setup'}
  <header class="page-head">
    <p class="eyebrow light">{t('race.eyebrow')}</p>
    <h1>{t('race.heading')}</h1>
    <p class="lead">{t('race.lead')}</p>
  </header>
  <section class="panel setup" in:fly={{ y: 12 }}>
    <div class="field">
      <span class="label">{t('common.scriptLabel')}</span>
      <ScriptPicker bind:value={s.raceScript} />
    </div>
    <div class="field">
      <span class="label">{t('race.kanaLabel')}</span>
      <div class="segmented wrap" role="group" aria-label={t('race.kanaLabel')}>
        {#each RACE_KANA as k (k)}
          <button aria-pressed={s.raceKana === k} onclick={() => (s.raceKana = k)}
            >{t(`race.kana.${k}` as MessageKey)}</button
          >
        {/each}
      </div>
    </div>
    {#if s.raceKana === 'rows'}
      <div class="rows">
        <RowPicker
          {rows}
          katakana={s.raceScript === 'katakana'}
          both={s.raceScript === 'both'}
          bind:selected={s.raceRows}
        />
        <div class="row">
          <button class="btn small ghost" onclick={() => (s.raceRows = rows.map((r) => r.key))}
            >{t('study.setup.selectAll')}</button
          >
          <button class="btn small ghost" onclick={() => (s.raceRows = [])}
            >{t('study.setup.clear')}</button
          >
        </div>
      </div>
    {/if}
    <label class="switch"
      ><span>{t('race.shuffle')}</span><input type="checkbox" bind:checked={s.raceShuffle} /></label
    >
    <div class="go">
      <span class="muted">
        {#if !chosen.length}{empty}{:else if chosenBest}{t('race.best', {
            time: formatRaceTime(chosenBest.ms),
          })}{/if}
      </span>
      <button class="btn primary" disabled={!chosen.length} onclick={startFromSetup}>
        {t('race.start', { count: chosen.length })} <kbd>Enter</kbd>
      </button>
    </div>
  </section>
{:else}
  <div class="race">
    <SessionTopbar
      onleave={leave}
      progress={(phase === 'done' ? questions.length : index) / questions.length}
    >
      {#snippet title()}
        <strong
          >{t('race.heading')}<span class="title-script">{` · ${scriptLabel(choice)}`}</span
          ></strong
        >
      {/snippet}
      <span class="progress" aria-label={t('race.progressLabel')}
        >{Math.min(index + 1, questions.length)} / {questions.length}</span
      >
      <span class="time" aria-label={t('race.timeLabel')}>{formatClock(elapsed / 1000)}</span>
    </SessionTopbar>

    {#if phase === 'running' && current}
      <QuizQuestion
        question={current}
        round={index}
        {font}
        {reveal}
        {touch}
        {options}
        onanswer={answer}
      />
    {:else if phase === 'done'}
      <section class="panel card" in:fly={{ y: 12 }}>
        {#if record}<div class="seal">
            <Hanko size={72} stamp title={t('sprint.newRecordTitle')} />
          </div>{/if}
        <p class="eyebrow">{t('race.doneEyebrow')}</p>
        <h2>{t('race.doneTime', { count: questions.length, time: formatRaceTime(elapsed) })}</h2>
        <p class="muted">
          {t('race.perKana', { seconds: perKana })} ·
          {t('sprint.mistakes', { mistakes })} ·
          {#if record && previous}
            {t('race.newRecord', { previous: formatRaceTime(previous.ms) })}
          {:else if previous}
            {t('race.best', { time: formatRaceTime(previous.ms) })}
          {:else}
            {t('race.firstTime')}
          {/if}
        </p>
        <div class="row">
          <button class="btn primary" onclick={() => start(questions)}
            >{t('common.again')} <kbd>Enter</kbd></button
          >
          {#if missed.length && missed.length < questions.length}
            <button class="btn" onclick={() => start(missed.map((m) => m.question))}
              >{t('race.missedAgain')}</button
            >
          {/if}
          <button class="btn" onclick={leave}>{t('sprint.change')}</button>
          <a class="btn" href="#/practice">{t('nav.practice')}</a>
        </div>
      </section>
      <MissedKana
        bind:this={review}
        missed={missed.map((m) => ({ kana: m.question.kana, text: m.text, typed: m.typed }))}
      />
    {/if}
  </div>
{/if}

<style>
  .lead {
    max-width: 58ch;
  }

  .setup {
    width: min(100%, 640px);
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

  @media (max-width: 520px) {
    .segmented.wrap {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-radius: 20px;
    }
  }

  .rows :global(.rows) {
    margin: 0 0 0.5rem;
  }

  .go {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .race {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .time,
  .progress {
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    white-space: nowrap;
  }

  .time {
    min-width: 4ch;
    text-align: right;
    font-size: 1.3rem;
    font-family: var(--font-heading);
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

  /* On phones the script would push the title onto two lines. */
  @media (max-width: 520px) {
    .title-script {
      display: none;
    }
  }
</style>
