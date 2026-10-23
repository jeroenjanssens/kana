<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import SessionTopbar from '../components/SessionTopbar.svelte'
  import MissedKana from '../components/MissedKana.svelte'
  import RowPicker from '../components/RowPicker.svelte'
  import WritingPad from '../components/WritingPad.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { BASIC_ROWS, displayRomaji, glyph, type Kana, type Script } from '../lib/data/kana'
  import { hasStrokes, strokesFor } from '../lib/data/strokes'
  import { deckKana } from '../lib/srs/queue'
  import type { MessageKey } from '../lib/i18n/messages'
  import { logPractice } from '../lib/study/actions'
  import {
    checkWriting,
    describeResult,
    referenceStrokes,
    traceScore,
    type Point,
    type WritingResult,
  } from '../lib/study/handwriting'
  import { kanaInRows, rowOptions } from '../lib/study/rows'
  import { shuffle } from '../lib/ui/random'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { cardDone } from '../state/photos.svelte'
  import { t } from '../state/i18n.svelte'
  import { ui } from '../state/ui.svelte'

  /**
   * Tracing: write each kana over a faint guide (numbered strokes with their starting points) to
   * get a feel for the shapes. Checked like writing, but logged as practice: it never changes the
   * writing schedule.
   */
  const s = $derived(settings())

  let phase = $state<'setup' | 'trace' | 'done'>('setup')
  let script = $state<Script>('hiragana')
  const rows = $derived(
    rowOptions(deckKana(`write-${script}`, settings().groups).filter((k) => canTrace(k, script))),
  )
  let selected = $state<string[]>(firstRows())
  let shuffled = $state(false)

  let list = $state<Kana[]>([])
  let index = $state(0)
  let attempt = $state(0)
  let strokes = $state<Point[][]>([])
  let result = $state<WritingResult | undefined>()
  /** How closely the last attempt followed the guide, 0–100. */
  let score = $state(0)
  /** The best score per kana in this session, in order. */
  let best = $state<number[]>([])
  let startedAt = 0
  let voice: VoiceId = audio.pickVoice()
  let firstTryRight = $state(0)
  let missed = $state<{ kana: Kana; text: string }[]>([])
  let review = $state<MissedKana>()

  const current = $derived(phase === 'trace' ? list[index] : undefined)
  const text = $derived(current ? glyph(current, script) : '')
  const glyphs = $derived(text ? strokesFor(text) : [])
  const count = $derived(kanaInRows(rows, selected).length)
  const average = $derived(
    best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0,
  )

  onDestroy(() => {
    ui.focus = false
  })

  function canTrace(k: Kana, sc: Script): boolean {
    return [...glyph(k, sc)].every(hasStrokes)
  }

  function firstRows(): string[] {
    return rowOptions(deckKana('write-hiragana', settings().groups))
      .filter((r) => r.group === 'basic' && BASIC_ROWS.slice(0, 2).includes(r.row))
      .map((r) => r.key)
  }

  function start() {
    const kana = kanaInRows(rows, selected)
    if (!kana.length) return
    list = shuffled ? shuffle(kana) : kana
    index = 0
    firstTryRight = 0
    best = []
    missed = []
    phase = 'trace'
    ui.focus = true
    show()
  }

  function show() {
    strokes = []
    result = undefined
    attempt = 0
    voice = audio.pickVoice()
    startedAt = performance.now()
    if (s.autoplay && list[index]) void audio.playVoice(list[index].id, voice)
  }

  function check() {
    if (!current || result || !strokes.length) return
    const reference = referenceStrokes(glyphs)
    result = checkWriting(strokes, reference)
    score = traceScore(strokes, reference)
    best[index] = Math.max(best[index] ?? 0, score)
    logPractice(store.data, {
      mode: 'trace',
      deck: `write-${script}`,
      id: current.id,
      correct: result.correct,
      ms: performance.now() - startedAt,
    })
    if (attempt === 0) {
      if (result.correct) firstTryRight++
      else missed.push({ kana: current, text })
    }
    feedback(result.correct ? 3 : 1)
    void audio.playSfx(result.correct ? 'flip' : 'wrong')
  }

  function again() {
    strokes = []
    result = undefined
    attempt++
    startedAt = performance.now()
  }

  function next() {
    if (!result) return
    cardDone()
    if (index + 1 >= list.length) return finish()
    index++
    show()
  }

  function finish() {
    phase = 'done'
    ui.focus = false
    void audio.playSfx('complete')
  }

  function leave() {
    phase = 'setup'
    ui.focus = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (review?.handleKey(e)) return
    const key = e.key.toLowerCase()
    if (key === 'escape' && phase !== 'setup') return leave()
    if (phase !== 'trace') {
      if (key === 'enter' && count) {
        e.preventDefault()
        start()
      }
      return
    }
    if (key === 'enter') {
      e.preventDefault()
      if (!result) check()
      else next()
    } else if (key === 'r' && result) again()
    else if (key === 'p' && current) void audio.playVoice(current.id, voice)
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'setup'}
  <header class="page-head">
    <p class="eyebrow light">{t('trace.eyebrow')}</p>
    <h1>{t('trace.heading')}</h1>
    <p class="lead">{t('trace.lead')}</p>
  </header>
  <section class="setup panel" in:fly={{ y: 12 }}>
    <div class="segmented" role="group" aria-label={t('trace.script')}>
      {#each ['hiragana', 'katakana'] as const as sc (sc)}
        <button aria-pressed={script === sc} onclick={() => (script = sc)}
          >{t(`common.${sc}` as MessageKey)}</button
        >
      {/each}
    </div>
    <RowPicker {rows} katakana={script === 'katakana'} bind:selected />
    <div class="actions">
      <button class="btn small ghost" onclick={() => (selected = rows.map((r) => r.key))}
        >{t('study.setup.selectAll')}</button
      >
      <button class="btn small ghost" onclick={() => (selected = [])}
        >{t('study.setup.clear')}</button
      >
      <label class="switch inline"
        ><span>{t('study.setup.shuffle')}</span><input
          type="checkbox"
          bind:checked={shuffled}
        /></label
      >
      <button class="btn primary" disabled={!count} onclick={start}>
        {t('trace.start', { count })}
      </button>
    </div>
  </section>
{:else}
  <div class="tracing">
    <SessionTopbar
      title={t('trace.title', { script: t(`common.${script}` as MessageKey) })}
      onleave={leave}
      progress={(index + (result ? 1 : 0)) / list.length}
    >
      <span class="muted">{Math.min(index + 1, list.length)} / {list.length}</span>
    </SessionTopbar>

    {#if current}
      {#key index}
        <section class="stage" in:fly={{ y: 14, duration: 300 }}>
          <div class="prompt">
            <span class="romaji">{displayRomaji(current, s.romaji)}</span>
            <button class="btn small" onclick={() => current && audio.playVoice(current.id, voice)}>
              <Icon name="play" size={14} filled />
              {t('common.listen')}
            </button>
          </div>
          <WritingPad
            bind:strokes
            cells={glyphs.length || 1}
            reference={glyphs}
            {result}
            guide
            disabled={!!result}
          />
          {#if !result}
            <button class="btn primary" onclick={check} disabled={!strokes.length}
              >{t('write.checkBtn')} <kbd>Enter</kbd></button
            >
          {:else}
            {@const r = describeResult(result)}
            <div class="outcome" aria-live="polite">
              <span class="score" class:low={score < 60} aria-label={t('trace.scoreLabel')}
                >{score}%</span
              >
              <p class="verdict" class:wrong={!result.correct}>{t(r.key, r.params)}</p>
            </div>
            <div class="row">
              <button class="btn" class:primary={!result.correct} onclick={again}
                >{t('trace.again')} <kbd>R</kbd></button
              >
              <button class="btn" class:primary={result.correct} onclick={next}
                >{t('common.next')} <kbd>Enter</kbd></button
              >
            </div>
          {/if}
        </section>
      {/key}
    {:else if phase === 'done'}
      <section class="done panel" in:fly={{ y: 12 }}>
        <h2>{t('trace.doneTitle')}</h2>
        <p>
          {t('trace.doneSummary', { correct: firstTryRight, total: list.length })}
          {t('trace.doneAverage', { score: average })}
        </p>
        <div class="row">
          <button class="btn primary" onclick={start}>{t('common.again')} <kbd>Enter</kbd></button>
          <button class="btn" onclick={leave}>{t('trace.otherRows')}</button>
          <a class="btn" href="#/practice">{t('nav.practice')}</a>
        </div>
      </section>
      <MissedKana bind:this={review} {missed} width="560px" />
    {/if}
  </div>
{/if}

<style>
  .lead {
    max-width: 62ch;
  }

  .setup,
  .done {
    width: min(100%, 720px);
    padding: 1.5rem;
  }

  .actions,
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .actions .primary {
    margin-left: auto;
  }

  .switch.inline {
    gap: 0.6rem;
  }

  .tracing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .prompt {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius);
    background: var(--panel);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--shadow-soft);
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 2.2rem;
    line-height: 1.1;
  }

  .outcome {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .score {
    min-width: 3.5ch;
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    background: var(--panel-strong);
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--level-mature);
  }

  .score.low {
    color: var(--shu);
  }

  .verdict {
    margin: 0;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    background: var(--panel-strong);
    font-weight: 600;
    color: var(--level-mature);
  }

  .verdict.wrong {
    color: var(--shu);
  }

  .done h2 {
    margin-top: 0;
  }
</style>
