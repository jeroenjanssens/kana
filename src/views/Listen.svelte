<script lang="ts">
  import { washiStyle } from '../lib/ui/washi'
  import { onDestroy, onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MasteryBar from '../components/MasteryBar.svelte'
  import { confusableSets } from '../lib/data/confusables'
  import { displayRomaji, glyph, kanaById, kanaByChar, type Kana } from '../lib/data/kana'
  import { Session, deckKana } from '../lib/srs/queue'
  import type { VoiceId } from '../lib/audio/voices'
  import type { DeckId } from '../lib/storage/schema'
  import { recordReview } from '../lib/study/actions'
  import { UndoStack } from '../lib/study/undo'
  import { LISTEN_ADVANCE_MS, listenGrade } from '../lib/study/listen'
  import { chooseOptions } from '../lib/study/distractors'
  import { deckSummary, queueFor } from '../lib/study/summary'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { navigate, route } from '../state/router.svelte'
  import { cardDone } from '../state/photos.svelte'
  import { ui } from '../state/ui.svelte'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  const scriptParam = route.segments[1]
  const script =
    scriptParam === 'katakana' ? 'katakana' : scriptParam === 'hiragana' ? 'hiragana' : undefined
  const deck: DeckId | undefined = script ? `listen-${script}` : undefined

  let session: Session | undefined
  let current = $state<Kana | undefined>()
  let options = $state<Kana[]>([])
  let picked = $state<Kana | undefined>()
  let done = $state(false)
  let counts = $state({ progress: 0, unseen: 0, repeating: 0 })
  const undoStack = new UndoStack()
  let canUndo = $state(false)

  function syncCounts() {
    if (session) {
      counts = { progress: session.progress, unseen: session.unseen, repeating: session.repeating }
    }
  }
  let answered = $state(0)
  let correctCount = $state(0)
  let startedAt = 0
  /** One voice per card, so replays don't switch speakers ("random" setting). */
  let voice: VoiceId = audio.pickVoice()
  let advance: ReturnType<typeof setTimeout> | undefined

  onMount(() => {
    if (!deck) return
    ui.focus = true
    session = new Session(queueFor(store.data, deck))
    syncCounts()
    void next()
  })

  onDestroy(() => (ui.focus = false))

  function lookAlikes(k: Kana): string[] {
    const char = glyph(k, script ?? 'hiragana')
    return confusableSets
      .filter((s) => s.chars.includes(char))
      .flatMap((s) => s.chars)
      .map((c) => kanaByChar(c)?.id)
      .filter((id): id is string => !!id && id !== k.id)
  }

  async function next() {
    // A manual "next" cancels the automatic one after a correct answer.
    clearTimeout(advance)
    advance = undefined
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
    await loadFontWithin(settings().font)
    picked = undefined
    current = k
    voice = audio.pickVoice()
    options = chooseOptions(k, deckKana(deck, settings().groups), 6, {
      soundAlikes: true,
      lookAlikes: lookAlikes(k),
    })
    startedAt = performance.now()
    void audio.playVoice(k.id, voice)
  }

  async function pick(k: Kana) {
    if (!current || !session || !deck || picked) return
    picked = k
    const correct = k.id === current.id
    const ms = performance.now() - startedAt
    const grade = listenGrade(correct, ms)
    undoStack.record(store.data, session, deck, current.id)
    canUndo = true
    const result = recordReview(store.data, {
      deck,
      id: current.id,
      grade,
      ms,
      mode: 'listen',
      correct,
      answer: k.id,
    })
    session.answer(current.id, result.after)
    answered++
    feedback(grade)
    if (correct) {
      correctCount++
    } else {
      setTimeout(() => current && audio.playVoice(current.id, voice), 450)
    }
    cardDone()
    if (correct) {
      // Hear it once more, then move on (Enter, Space or Next skip the wait).
      setTimeout(() => current && picked && audio.playVoice(current.id, voice), 350)
      advance = setTimeout(next, LISTEN_ADVANCE_MS)
    }
  }

  /** Undo the last answer and show that card again. */
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
    if (
      (e.key === 'u' && !e.metaKey && !e.ctrlKey) ||
      (e.key === 'z' && (e.metaKey || e.ctrlKey))
    ) {
      e.preventDefault()
      undoLast()
      return
    }
    if (!current) return
    const key = e.key.toLowerCase()
    if (key === 'escape') navigate('/practice')
    else if (key === 'p' || key === 'r') void audio.playVoice(current.id, voice)
    else if ((key === 'enter' || key === ' ') && picked) {
      e.preventDefault()
      void next()
    } else if (!picked && Number(key) >= 1 && Number(key) <= options.length) {
      void pick(options[Number(key) - 1])
    }
  }

  const summaries = $derived(
    (['listen-hiragana', 'listen-katakana'] as const).map((d) => deckSummary(store.data, d)),
  )
</script>

<svelte:window onkeydown={onKeydown} />

{#if !deck}
  <header class="page-head">
    <p class="eyebrow light">{t('listen.eyebrow')}</p>
    <h1>{t('listen.heading')}</h1>
    <p class="lead">{t('listen.lead')}</p>
  </header>
  <div class="decks">
    {#each summaries as d (d.deck)}
      {@const isKata = d.deck === 'listen-katakana'}
      <article class="deck panel">
        <div class="head">
          <span class="icon"><Icon name="ear" size={28} /></span>
          <div>
            <h2>{isKata ? t('common.katakana') : t('common.hiragana')}</h2>
            <p class="muted">{t('listen.sounds', { count: d.total })}</p>
          </div>
        </div>
        <p class="counts">
          <strong>{d.due}</strong>
          {t('listen.due')} · <strong>{d.fresh}</strong>
          {t('listen.newToday')}
        </p>
        <MasteryBar counts={d.mastery} total={d.total} />
        <a class="btn primary" href="#/listen/{isKata ? 'katakana' : 'hiragana'}">
          {d.due + d.fresh
            ? t('practice.deckStart', { count: d.due + d.fresh })
            : t('practice.allDoneBtn')}
        </a>
      </article>
    {/each}
  </div>
{:else}
  <div class="listen">
    <div class="topbar panel">
      <button
        class="btn icon ghost"
        onclick={() => navigate('/listen')}
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
          <button
            class="speaker washi"
            onclick={() => current && audio.playVoice(current.id, voice)}
            aria-label={t('listen.playAgainLabel')}
          >
            <Icon name="speaker" size={56} />
            <span class="muted">{t('listen.playAgain')} <kbd>P</kbd></span>
          </button>
          <div class="options" role="group" aria-label={t('listen.whichKana')}>
            {#each options as o, i (o.id)}
              <button
                class="option washi turn"
                style={washiStyle(o.id)}
                class:right={picked && o.id === current.id}
                class:wrong={picked?.id === o.id && o.id !== current.id}
                disabled={!!picked}
                onclick={() => pick(o)}
              >
                <KanaGlyph
                  text={glyph(o, script ?? 'hiragana')}
                  font={settings().font}
                  size="3.2rem"
                  ink={false}
                />
                {#if picked}<span class="romaji">{displayRomaji(o, settings().romaji)}</span>{/if}
                <kbd>{i + 1}</kbd>
              </button>
            {/each}
          </div>
          {#if picked && picked.id !== current.id}
            <div class="after">
              <button class="btn small" onclick={() => picked && audio.playVoice(picked.id, voice)}>
                <Icon name="play" size={14} filled />
                {t('listen.hearPicked', { romaji: picked.romaji })}
              </button>
              <button class="btn primary" onclick={next}>{t('common.next')} <kbd>Enter</kbd></button
              >
            </div>
          {:else if picked}
            <div class="after">
              <button class="btn" onclick={next}>{t('common.next')} <kbd>Enter</kbd></button>
            </div>
          {/if}
        </section>
      {/key}
    {:else if done}
      <section class="done panel">
        <h2>{answered ? t('listen.sessionComplete') : t('listen.sessionNothing')}</h2>
        {#if answered}
          <p>{t('listen.sessionCorrect', { correct: correctCount, answered })}</p>
        {:else}
          <p class="muted">{t('listen.sessionAllDone')}</p>
        {/if}
        <div class="row">
          <a class="btn primary" href="#/practice">{t('practice.backToPractice')}</a>
          <a class="btn" href="#/">{t('common.home')}</a>
        </div>
      </section>
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
    max-width: 56ch;
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

  .listen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
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
    gap: 1.5rem;
    width: min(100%, 640px);
  }

  .speaker {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow);
    cursor: pointer;
    color: var(--ink);
    transition: transform 0.2s var(--ease);
  }

  .speaker:active {
    transform: scale(0.96);
  }

  .speaker .muted {
    font-size: 0.75rem;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
  }

  .option {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 16px;
    min-height: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-soft);
    color: var(--ink);
    transition:
      transform 0.15s var(--ease),
      box-shadow 0.2s;
  }

  .option:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  .option:disabled {
    cursor: default;
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

  .romaji {
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .after {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .done {
    width: min(100%, 560px);
    padding: 1.5rem;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }
</style>
