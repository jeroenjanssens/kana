<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MasteryBar from '../components/MasteryBar.svelte'
  import Modal from '../components/Modal.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import WritingPad from '../components/WritingPad.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { confusableSets } from '../lib/data/confusables'
  import { displayRomaji, glyph, kanaByChar, kanaById, type Kana } from '../lib/data/kana'
  import { strokesFor } from '../lib/data/strokes'
  import { Session, deckKana } from '../lib/srs/queue'
  import type { DeckId, Grade } from '../lib/storage/schema'
  import { recordReview } from '../lib/study/actions'
  import { chooseOptions } from '../lib/study/distractors'
  import {
    checkWriting,
    describeResult,
    referenceStrokes,
    writingGrade,
    type Point,
    type WritingResult,
  } from '../lib/study/handwriting'
  import { listenGrade } from '../lib/study/listen'
  import { deckSummary, queueFor } from '../lib/study/summary'
  import { UndoStack } from '../lib/study/undo'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { cardDone } from '../state/photos.svelte'
  import { navigate, route } from '../state/router.svelte'
  import { ui } from '../state/ui.svelte'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  const scriptParam = route.segments[1]
  const script =
    scriptParam === 'katakana' ? 'katakana' : scriptParam === 'hiragana' ? 'hiragana' : undefined
  const deck: DeckId | undefined = script ? `write-${script}` : undefined
  const s = $derived(settings())

  let session: Session | undefined
  const undoStack = new UndoStack()
  let canUndo = $state(false)
  let counts = $state({ progress: 0, unseen: 0, repeating: 0 })
  let current = $state<Kana | undefined>()
  let voice: VoiceId = audio.pickVoice()
  let startedAt = 0
  let done = $state(false)
  let answered = $state(0)
  let correctCount = $state(0)

  // Draw
  let strokes = $state<Point[][]>([])
  let result = $state<WritingResult | undefined>()
  let suggested = $state<Grade | undefined>()
  let peeked = $state(false)
  let strokesOpen = $state(false)

  // Choose
  let options = $state<Kana[]>([])
  let picked = $state<Kana | undefined>()
  let advance: ReturnType<typeof setTimeout> | undefined

  const text = $derived(current && script ? glyph(current, script) : '')
  const glyphs = $derived(text ? strokesFor(text) : [])
  const choose = $derived(s.writeStyle === 'choose')

  onMount(() => {
    if (!deck) return
    ui.focus = true
    session = new Session(queueFor(store.data, deck))
    void next()
  })

  onDestroy(() => {
    ui.focus = false
    clearTimeout(advance)
  })

  function syncCounts() {
    if (session) {
      counts = { progress: session.progress, unseen: session.unseen, repeating: session.repeating }
    }
  }

  function lookAlikes(k: Kana): string[] {
    const char = glyph(k, script ?? 'hiragana')
    return confusableSets
      .filter((set) => set.chars.includes(char))
      .flatMap((set) => set.chars)
      .map((c) => kanaByChar(c)?.id)
      .filter((id): id is string => !!id && id !== k.id)
  }

  async function next() {
    clearTimeout(advance)
    if (!session || !deck) return
    const id = session.next()
    syncCounts()
    if (!id) {
      done = true
      current = undefined
      if (answered) void audio.playSfx('complete')
      return
    }
    const k = kanaById(id)
    await loadFontWithin(s.font)
    strokes = []
    result = undefined
    suggested = undefined
    peeked = false
    picked = undefined
    voice = audio.pickVoice()
    current = k
    options = chooseOptions(k, deckKana(deck, s.groups), 6, { lookAlikes: lookAlikes(k) })
    startedAt = performance.now()
  }

  function check() {
    if (!current || result || !strokes.length) return
    result = checkWriting(strokes, referenceStrokes(glyphs))
    const g = writingGrade(result, performance.now() - startedAt)
    // Looking at the strokes first is fine, but it can't be "Easy" or "Good" then.
    suggested = peeked && g > 2 ? 2 : g
    void audio.playSfx(result.correct ? 'flip' : 'wrong')
    void audio.playVoice(current.id, voice)
  }

  function record(grade: Grade, correct: boolean, answer?: string) {
    if (!current || !session || !deck) return
    undoStack.record(store.data, session, deck, current.id)
    canUndo = true
    const r = recordReview(store.data, {
      deck,
      id: current.id,
      grade,
      ms: performance.now() - startedAt,
      mode: 'write',
      correct,
      ...(answer ? { answer } : {}),
    })
    session.answer(current.id, r.after)
    answered++
    if (correct) correctCount++
    feedback(grade)
    cardDone()
  }

  function grade(g: Grade) {
    if (!result) return
    record(g, result.correct)
    void next()
  }

  function pick(k: Kana) {
    if (!current || picked) return
    picked = k
    const correct = k.id === current.id
    record(listenGrade(correct, performance.now() - startedAt), correct, k.id)
    if (correct) advance = setTimeout(next, 1200)
  }

  function undoLast() {
    if (!session || !undoStack.size) return
    const last = store.data.log.at(-1)
    if (!undoStack.undo(store.data, session)) return
    canUndo = undoStack.size > 0
    answered = Math.max(0, answered - 1)
    if (last?.correct) correctCount = Math.max(0, correctCount - 1)
    done = false
    void next()
  }

  function onKeydown(e: KeyboardEvent) {
    if (!deck || strokesOpen) return
    const key = e.key.toLowerCase()
    if ((key === 'u' && !e.metaKey && !e.ctrlKey) || (key === 'z' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault()
      undoLast()
    } else if (key === 'escape') navigate('/write')
    else if (!current) return
    else if (key === 'p') void audio.playVoice(current.id, voice)
    else if (choose) {
      if ((key === 'enter' || key === ' ') && picked) {
        e.preventDefault()
        void next()
      } else if (!picked && Number(key) >= 1 && Number(key) <= options.length) {
        pick(options[Number(key) - 1])
      }
    } else if (key === 'enter') {
      e.preventDefault()
      if (!result) check()
      else if (suggested) grade(suggested)
    } else if (result && ['1', '2', '3', '4'].includes(key)) grade(Number(key) as Grade)
  }

  const summaries = $derived(
    (['write-hiragana', 'write-katakana'] as const).map((d) => deckSummary(store.data, d)),
  )
</script>

<svelte:window onkeydown={onKeydown} />

{#if !deck}
  <header class="page-head">
    <p class="eyebrow light">{t('write.eyebrow')}</p>
    <h1>{t('write.heading')}</h1>
    <p class="lead">{t('write.lead')}</p>
  </header>
  <div class="style panel">
    <span>{t('write.answerBy')}</span>
    <div class="segmented" role="group" aria-label={t('write.answerBy')}>
      <button aria-pressed={s.writeStyle === 'draw'} onclick={() => (s.writeStyle = 'draw')}
        >{t('write.drawing')}</button
      >
      <button aria-pressed={s.writeStyle === 'choose'} onclick={() => (s.writeStyle = 'choose')}
        >{t('write.choosing')}</button
      >
    </div>
  </div>
  <div class="decks">
    {#each summaries as d (d.deck)}
      {@const kata = d.deck === 'write-katakana'}
      <article class="deck panel">
        <div class="head">
          <span class="icon"><Icon name="brush" size={28} /></span>
          <div>
            <h2>{kata ? t('common.katakana') : t('common.hiragana')}</h2>
            <p class="muted">{t('write.kanaCount', { count: d.total })}</p>
          </div>
        </div>
        <p class="counts">
          <strong>{d.due}</strong>
          {t('listen.due')} · <strong>{d.fresh}</strong>
          {t('listen.newToday')}
        </p>
        <MasteryBar counts={d.mastery} total={d.total} />
        <a class="btn primary" href="#/write/{kata ? 'katakana' : 'hiragana'}">
          {d.due + d.fresh
            ? t('practice.deckStart', { count: d.due + d.fresh })
            : t('practice.allDoneBtn')}
        </a>
      </article>
    {/each}
  </div>
{:else}
  <div class="writing">
    <div class="topbar panel">
      <button
        class="btn icon ghost"
        onclick={() => navigate('/write')}
        aria-label={t('common.leave')}
      >
        <Icon name="close" />
      </button>
      <strong>{t(`deck.${deck}` as MessageKey)}</strong>
      <span class="bar" style:--p={counts.progress}></span>
      <button
        class="btn icon ghost"
        onclick={undoLast}
        disabled={!canUndo}
        aria-label={t('common.undo')}
        title={t('practice.undoTitle')}
      >
        <Icon name="undo" />
      </button>
      <span class="muted"
        >{t('common.left', { count: counts.unseen })}{counts.repeating
          ? ` · ${t('common.repeating', { count: counts.repeating })}`
          : ''}</span
      >
    </div>

    {#if current}
      {#key current.id + answered}
        <section class="stage" in:fly={{ y: 14, duration: 300 }}>
          <div class="prompt">
            <span class="eyebrow">{t('write.writeIn', { script: script ?? '' })}</span>
            <span class="romaji">{displayRomaji(current, s.romaji)}</span>
            <div class="row">
              <button
                class="btn small"
                onclick={() => current && audio.playVoice(current.id, voice)}
              >
                <Icon name="play" size={14} filled />
                {t('common.listen')}
              </button>
              {#if !choose && !result}
                <button
                  class="btn small ghost"
                  onclick={() => {
                    peeked = true
                    strokesOpen = true
                  }}><Icon name="brush" size={14} /> {t('write.showMe')}</button
                >
              {/if}
            </div>
          </div>

          {#if choose}
            <div class="options" role="group" aria-label={t('write.whichKana')}>
              {#each options as o, i (o.id)}
                <button
                  class="option washi"
                  class:right={picked && o.id === current.id}
                  class:wrong={picked?.id === o.id && o.id !== current.id}
                  disabled={!!picked}
                  onclick={() => pick(o)}
                >
                  <KanaGlyph
                    text={glyph(o, script ?? 'hiragana')}
                    font={s.font}
                    size="3rem"
                    ink={false}
                  />
                  <kbd>{i + 1}</kbd>
                </button>
              {/each}
            </div>
            {#if picked}
              <button class="btn primary" onclick={next}>{t('common.next')} <kbd>Enter</kbd></button
              >
            {/if}
          {:else}
            <WritingPad
              bind:strokes
              cells={glyphs.length || 1}
              reference={glyphs}
              {result}
              disabled={!!result}
            />
            {#if !result}
              <button class="btn primary" onclick={check} disabled={!strokes.length}
                >{t('write.checkBtn')} <kbd>Enter</kbd></button
              >
            {:else}
              {@const r = describeResult(result)}
              <p class="verdict" class:wrong={!result.correct} aria-live="polite">
                {t(r.key, r.params)}
              </p>
              <div class="grades" role="group" aria-label={t('write.howWell')}>
                {#each [1, 2, 3, 4] as const as g (g)}
                  <button
                    class="btn grade g{g}"
                    class:suggested={suggested === g}
                    onclick={() => grade(g)}
                  >
                    {t(`grade.${g}` as MessageKey)} <kbd>{g}</kbd>
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </section>
      {/key}
    {:else if done}
      <section class="done panel">
        <h2>{answered ? t('write.sessionComplete') : t('write.sessionNothing')}</h2>
        {#if answered}
          <p>{t('write.sessionCorrect', { correct: correctCount, answered })}</p>
        {:else}
          <p class="muted">{t('write.sessionAllDone')}</p>
        {/if}
        <div class="row">
          <a class="btn primary" href="#/practice">{t('practice.backToPractice')}</a>
          <a class="btn" href="#/">{t('common.home')}</a>
        </div>
      </section>
    {/if}
  </div>
{/if}

{#if current && text}
  <Modal bind:open={strokesOpen} title={t('write.strokeOrder')}>
    <StrokeOrder {text} />
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

  .style {
    display: inline-flex;
    gap: 0.8rem;
    align-items: center;
    padding: 0.35rem 0.4rem 0.35rem 1rem;
    margin-bottom: 1rem;
  }

  .decks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .deck {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .head {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .head h2,
  .head p {
    margin: 0;
  }

  .icon {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }

  .counts {
    margin: 0;
  }

  .writing {
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

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.8rem 1.6rem;
    border-radius: var(--radius);
    background: var(--panel);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--shadow-soft);
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 2.8rem;
    line-height: 1.1;
  }

  .row {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: min(92vw, 520px);
  }

  .option {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 16px;
    min-height: 100px;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--shadow-soft);
    color: var(--ink);
  }

  .option kbd {
    position: absolute;
    top: 6px;
    left: 8px;
  }

  .option.right {
    box-shadow:
      0 0 0 3px var(--level-mature),
      var(--shadow);
  }

  .option.wrong {
    box-shadow:
      0 0 0 3px var(--shu),
      var(--shadow);
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

  .grades {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    width: min(92vw, 520px);
  }

  .grade {
    border-radius: 14px;
  }

  .g1 {
    border-bottom: 3px solid var(--shu);
  }
  .g2 {
    border-bottom: 3px solid var(--level-learning);
  }
  .g3 {
    border-bottom: 3px solid var(--level-young);
  }
  .g4 {
    border-bottom: 3px solid var(--ai);
  }

  .grade.suggested {
    box-shadow:
      0 0 0 2px var(--ink),
      var(--shadow-soft);
  }

  .done {
    width: min(100%, 560px);
    padding: 1.5rem;
  }
</style>
