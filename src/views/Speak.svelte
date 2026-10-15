<script lang="ts">
  import '../lib/i18n/speech'
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MissedKana from '../components/MissedKana.svelte'
  import RowPicker from '../components/RowPicker.svelte'
  import SayButton from '../components/SayButton.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { nextCardFont } from '../lib/data/fonts'
  import { BASIC_ROWS, glyph, kanaById, type Kana, type Script } from '../lib/data/kana'
  import type { MessageKey } from '../lib/i18n/messages'
  import { SOUND_CLASSES, soundOf } from '../lib/speech/classes'
  import { judge, type Verdict } from '../lib/speech/judge'
  import type { KanaResult } from '../lib/speech/recognize'
  import { deckKana } from '../lib/srs/queue'
  import { logPractice } from '../lib/study/actions'
  import { kanaInRows, rowOptions } from '../lib/study/rows'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { shuffle } from '../lib/ui/random'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { cardDone } from '../state/photos.svelte'
  import { t } from '../state/i18n.svelte'
  import { ui } from '../state/ui.svelte'

  /**
   * Say it: see a kana, say it, and the offline speech model says what it heard. Logged as
   * practice: it never changes a schedule, and (since the model can be wrong) doesn't count
   * towards accuracy.
   */
  const s = $derived(settings())

  let phase = $state<'setup' | 'speak' | 'done'>('setup')
  let script = $state<Script>('hiragana')
  const rows = $derived(rowOptions(deckKana(script, settings().groups).filter((k) => soundOf(k))))
  let selected = $state<string[]>(
    rowOptions(deckKana('hiragana', settings().groups))
      .filter((r) => r.group === 'basic' && BASIC_ROWS.slice(0, 2).includes(r.row))
      .map((r) => r.key),
  )
  let shuffled = $state(false)
  const count = $derived(kanaInRows(rows, selected).length)

  let list = $state<Kana[]>([])
  let index = $state(0)
  let attempt = $state(0)
  let verdict = $state<Verdict | undefined>()
  let font = $state(settings().font)
  let voice: VoiceId = audio.pickVoice()
  let shownAt = 0
  let firstTryRight = $state(0)
  let best = $state<number[]>([])
  let missed = $state<{ kana: Kana; text: string; typed: string }[]>([])
  let review = $state<MissedKana>()
  let mic = $state<SayButton>()

  const current = $derived(phase === 'speak' ? list[index] : undefined)
  const average = $derived(
    best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0,
  )

  onDestroy(() => {
    ui.focus = false
  })

  /** How a sound is written in this script (its first kana). */
  function written(sound: string): string {
    const k = kanaById(SOUND_CLASSES.find((c) => c.id === sound)!.kana[0])
    return glyph(k, script)
  }

  async function start() {
    const kana = kanaInRows(rows, selected)
    if (!kana.length) return
    list = shuffled ? shuffle(kana) : kana
    index = 0
    firstTryRight = 0
    best = []
    missed = []
    phase = 'speak'
    ui.focus = true
    await show()
  }

  async function show() {
    verdict = undefined
    attempt = 0
    voice = audio.pickVoice()
    const next = nextCardFont(s, font)
    await loadFontWithin(next)
    font = next
    shownAt = performance.now()
  }

  function heard(result: KanaResult) {
    if (!current) return
    const sound = soundOf(current)!
    verdict = judge(result, sound)
    best[index] = Math.max(best[index] ?? 0, verdict.score)
    logPractice(store.data, {
      mode: 'speak',
      deck: script,
      id: current.id,
      correct: verdict.correct,
      ms: performance.now() - shownAt,
    })
    if (attempt === 0) {
      if (verdict.correct) firstTryRight++
      else {
        missed.push({
          kana: current,
          text: glyph(current, script),
          typed: verdict.nothing ? '' : written(verdict.heard[0].sound),
        })
      }
    }
    attempt++
    feedback(verdict.correct ? 3 : 1)
    void audio.playSfx(verdict.correct ? 'flip' : 'wrong')
  }

  function again() {
    verdict = undefined
    shownAt = performance.now()
  }

  async function next() {
    cardDone()
    if (index + 1 >= list.length) return finish()
    index++
    await show()
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
    if (phase !== 'speak') {
      if (key === 'enter' && count) {
        e.preventDefault()
        void start()
      }
      return
    }
    if (key === ' ' && !verdict) {
      e.preventDefault()
      mic?.start()
    } else if (key === 'enter' && verdict) {
      e.preventDefault()
      void next()
    } else if (key === 'r' && verdict) again()
    else if (key === 'p' && current) void audio.playVoice(current.id, voice)
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'setup'}
  <header class="page-head">
    <p class="eyebrow light">{t('speak.eyebrow')}</p>
    <h1>{t('speak.heading')}</h1>
    <p class="lead">{t('speak.lead')}</p>
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
    <p class="muted small">{t('speak.privacy')}</p>
  </section>
{:else}
  <div class="speaking">
    <div class="topbar panel">
      <button class="btn icon ghost" onclick={leave} aria-label={t('common.leave')}>
        <Icon name="close" />
      </button>
      <strong>{t('speak.title', { script: t(`common.${script}` as MessageKey) })}</strong>
      <span class="bar" style:--p={(index + (verdict ? 1 : 0)) / list.length}></span>
      <span class="muted">{Math.min(index + 1, list.length)} / {list.length}</span>
    </div>

    {#if current}
      {#key index}
        <section class="stage" in:fly={{ y: 14, duration: 300 }}>
          <div class="card washi">
            <KanaGlyph text={glyph(current, script)} {font} size="7rem" />
          </div>
          <button class="btn small" onclick={() => current && audio.playVoice(current.id, voice)}>
            <Icon name="play" size={14} filled />
            {t('speak.hear')} <kbd>P</kbd>
          </button>
          {#if !verdict}
            <SayButton bind:this={mic} label={t('speak.say')} onresult={heard} />
            <p class="muted small">{t('speak.hint')}</p>
          {:else}
            <div class="outcome" aria-live="polite">
              {#if verdict.nothing}
                <p class="verdict wrong">{t('speak.nothing')}</p>
              {:else if verdict.correct}
                <span class="score" aria-label={t('speak.scoreLabel')}>{verdict.score}%</span>
                <p class="verdict">{t('write.correct')}</p>
              {:else}
                <span class="score low" aria-label={t('speak.scoreLabel')}>{verdict.score}%</span>
                <p class="verdict wrong">
                  {t('speak.soundedLike', { kana: written(verdict.heard[0].sound) })}
                </p>
              {/if}
            </div>
            {#if !verdict.nothing}
              <ul class="heard" aria-label={t('speak.heardLabel')}>
                {#each verdict.heard as g (g.sound)}
                  <li class:target={g.sound === soundOf(current)}>
                    <span lang="ja">{written(g.sound)}</span>
                    <span class="muted">{Math.round(g.p * 100)}%</span>
                  </li>
                {/each}
              </ul>
            {/if}
            <div class="row">
              <button class="btn" class:primary={!verdict.correct} onclick={again}
                >{t('speak.again')} <kbd>R</kbd></button
              >
              <button class="btn" class:primary={verdict.correct} onclick={next}
                >{t('common.next')} <kbd>Enter</kbd></button
              >
            </div>
          {/if}
        </section>
      {/key}
    {:else if phase === 'done'}
      <section class="done panel" in:fly={{ y: 12 }}>
        <h2>{t('speak.doneTitle')}</h2>
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
      <MissedKana
        bind:this={review}
        {missed}
        width="560px"
        typedLabel={t('speak.soundedLikeLabel')}
      />
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
    justify-content: center;
  }

  .actions {
    justify-content: flex-start;
  }

  .actions .primary {
    margin-left: auto;
  }

  .switch.inline {
    gap: 0.6rem;
  }

  .small {
    font-size: 0.85rem;
    margin: 0.75rem 0 0;
  }

  .speaking {
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

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .card {
    width: min(70vw, 240px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 20px;
    box-shadow: var(--shadow);
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

  .heard {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.5rem;
  }

  .heard li {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    background: var(--panel);
    box-shadow: var(--shadow-soft);
  }

  .heard li span:first-child {
    font-family: var(--font-kana);
    font-size: 1.3rem;
  }

  .heard li.target {
    outline: 2px solid var(--level-mature);
  }

  .done h2 {
    margin-top: 0;
  }
</style>
