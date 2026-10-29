<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import SessionTopbar from '../components/SessionTopbar.svelte'
  import Modal from '../components/Modal.svelte'
  import PaperCard from '../components/PaperCard.svelte'
  import RuleList from '../components/RuleList.svelte'
  import ScriptPicker from '../components/ScriptPicker.svelte'
  import WordCard from '../components/WordCard.svelte'
  import WordList from '../components/WordList.svelte'
  import WordText from '../components/WordText.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { nextCardFont } from '../lib/data/fonts'
  import { segment } from '../lib/data/kana'
  import type { RuleId } from '../lib/data/rules'
  import { words, type Word } from '../lib/data/words'
  import type { MessageKey } from '../lib/i18n/messages'
  import { formatInterval, previewIntervals } from '../lib/srs/scheduler'
  import type { Grade } from '../lib/storage/schema'
  import { logPractice, markNoteSeen, recordWord } from '../lib/study/actions'
  import { checkWord, suggestGrade } from '../lib/study/answer'
  import {
    READING_COUNTS,
    glyphsText,
    inScript,
    missingKana,
    ofKind,
    readingCount,
    unlockedWords,
    wordCounts,
    wordKana,
    wordMeaning,
    wordText,
    type WordKana,
  } from '../lib/study/reading'
  import { READING_KINDS } from '../lib/study/scripts'
  import { migrateWordCards, ReadingSession, WordUndoStack } from '../lib/study/wordReviews'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, feedback, settings, store } from '../state/app.svelte'
  import { cardDone } from '../state/photos.svelte'
  import { ui } from '../state/ui.svelte'
  import { t, lang } from '../state/i18n.svelte'
  import { timers } from '../lib/ui/timers'

  // Words practised before reading had grades get their card from those answers.
  migrateWordCards(store.data)

  const s = $derived(settings())
  const unlocked = $derived(unlockedWords(store.data))
  const locked = $derived(
    words
      .filter((w) => !unlocked.includes(w))
      .map((w) => ({ w, missing: missingKana(store.data, w) }))
      .sort((a, b) => a.missing.length - b.missing.length),
  )
  /** The unlocked words that match the setup. */
  const pool = $derived(
    unlocked.filter((w) => inScript(w, s.readingScript) && ofKind(w, s.readingKind)),
  )
  const count = $derived(readingCount(s.readingCount))
  const counts = $derived(wordCounts(store.data, pool))

  let phase = $state<'overview' | 'card' | 'done'>('overview')
  let session: ReadingSession | undefined
  let current = $state<Word | undefined>()
  /** Cards shown so far, to animate each new one in. */
  let shown = $state(0)
  let answered = $state(0)
  let limit = $state(0)
  /** Every answer in the round, in order. */
  let results = $state<{ word: Word; grade: Grade }[]>([])
  let flipped = $state(false)
  let input = $state('')
  let verdict = $state<boolean | undefined>()
  let suggested = $state<Grade | undefined>()
  let intervals = $state<Record<Grade, number> | undefined>()
  /** Rules met for the first time on this card: their explanation is shown open. */
  let newRules = $state<RuleId[]>([])
  /** The word whose card is open from the overview or the summary. */
  let opened = $state<{ word: Word; missing: WordKana[] } | undefined>()
  let wordOpen = $state(false)
  let font = $state(settings().font)
  /** One voice per word card (matters for the "random" setting). */
  let voice: VoiceId = audio.pickVoice()
  let tilt = $state(0)
  /** Each card gets its own sheet of paper. */
  let paper = $state(0)
  let busy = false
  let startedAt = 0
  let inputEl = $state<HTMLInputElement>()
  const undoStack = new WordUndoStack()
  let canUndo = $state(false)

  const later = timers()
  onDestroy(() => {
    later.cancel()
    ui.focus = false
  })

  const typed = $derived(s.answerStyle === 'typed')
  const score = $derived(results.filter((r) => r.grade > 1).length)
  /** Words answered Again in this round, each once. */
  const missed = $derived([
    ...new Map(results.filter((r) => r.grade === 1).map((r) => [r.word.kana, r.word])).values(),
  ])

  async function start() {
    if (!pool.length) return
    limit = count
    session = new ReadingSession(pool, () => store.data, limit)
    results = []
    answered = 0
    undoStack.clear()
    canUndo = false
    ui.focus = true
    await showNext()
  }

  async function showNext() {
    const word = session?.next()
    if (!word) return finish()
    await show(word)
  }

  async function show(word: Word) {
    const f = nextCardFont(s, font)
    await loadFontWithin(f)
    font = f
    voice = audio.pickVoice()
    current = word
    shown++
    flipped = false
    verdict = undefined
    suggested = undefined
    intervals = undefined
    input = ''
    newRules = []
    tilt = (Math.random() - 0.5) * 1.2
    paper = Math.floor(Math.random() * 2 ** 31)
    phase = 'card'
    busy = false
    startedAt = performance.now()
    later.after(50, () => inputEl?.focus())
  }

  function reveal() {
    if (!current || flipped) return
    flipped = true
    intervals = previewIntervals(store.data.words[current.kana]?.card)
    void audio.playSfx('flip')
    const word = current
    if (s.autoplay) later.after(280, () => current === word && audio.playWord(word.index, voice))
    newRules = current.rules.filter((r) => markNoteSeen(store.data, r))
  }

  function submit() {
    if (!current || flipped) return
    verdict = checkWord(current, input)
    suggested = suggestGrade(verdict, performance.now() - startedAt, wordKana(current).length)
    reveal()
  }

  async function grade(g: Grade) {
    if (!current || !session || !flipped || busy) return
    busy = true
    undoStack.record(store.data, session, current.kana)
    canUndo = true
    recordWord(store.data, current.kana, g)
    logPractice(store.data, {
      mode: 'reading',
      id: current.kana,
      correct: verdict ?? g > 1,
      grade: g,
      ms: performance.now() - startedAt,
    })
    session.answer(current, g)
    answered = session.count
    results.push({ word: current, grade: g })
    feedback(g)
    cardDone()
    await later.wait(160)
    await showNext()
  }

  /** Undo the last answer: the word, the log and the round go back as they were. */
  async function undoLast() {
    if (!session || busy) return
    const kana = undoStack.undo(store.data, session)
    if (!kana) return
    canUndo = undoStack.size > 0
    answered = session.count
    results.pop()
    await show(words.find((w) => w.kana === kana)!)
  }

  function finish() {
    phase = 'done'
    current = undefined
    ui.focus = false
    void audio.playSfx('complete')
  }

  /** Leaving after an answer shows the summary (the only way to end a round without a limit). */
  function leave() {
    if (results.length) return finish()
    phase = 'overview'
    ui.focus = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (phase === 'overview' && e.key === 'Enter' && !wordOpen && e.target === document.body) {
      e.preventDefault()
      void start()
      return
    }
    if (phase !== 'card' || !current) return
    const inInput = (e.target as HTMLElement).tagName === 'INPUT'
    if (e.key === 'Escape') return leave()
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if (e.key === 'z' && !inInput) {
        e.preventDefault()
        void undoLast()
      }
      return
    }
    if (inInput && !flipped) return
    const key = e.key.toLowerCase()
    if (key === 'u') void undoLast()
    else if ((key === ' ' || key === 'enter') && !flipped && !typed) {
      e.preventDefault()
      reveal()
    } else if (flipped && key === 'enter') {
      e.preventDefault()
      void grade(suggested ?? 3)
    } else if (flipped && key === 'p') {
      void audio.playWord(current.index, voice)
    } else if (flipped && ['1', '2', '3', '4'].includes(key)) void grade(Number(key) as Grade)
  }

  /** The kana of the word on the card; `gap` where a new word of a phrase starts. */
  const parts = $derived(
    (current?.parts ?? []).flatMap((part, w) =>
      segment(part).map((p, i) => ({ ...p, gap: w > 0 && i === 0 })),
    ),
  )

  function openWord(word: Word, missing: WordKana[] = []) {
    opened = { word, missing }
    wordOpen = true
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if phase === 'overview'}
  <header class="page-head">
    <p class="eyebrow light">{t('reading.eyebrow')}</p>
    <h1>{t('reading.heading')}</h1>
    <p class="lead">{t('reading.lead')}</p>
  </header>

  <section class="panel block setup">
    <h2>{t('reading.unlocked', { count: unlocked.length, total: words.length })}</h2>
    <div class="field">
      <span class="label">{t('common.scriptLabel')}</span>
      <ScriptPicker bind:value={s.readingScript} />
    </div>
    <div class="field">
      <span class="label">{t('reading.kindLabel')}</span>
      <div class="segmented" role="group" aria-label={t('reading.kindLabel')}>
        {#each READING_KINDS as k (k)}
          <button aria-pressed={s.readingKind === k} onclick={() => (s.readingKind = k)}
            >{t(`reading.kind.${k}` as MessageKey)}</button
          >
        {/each}
      </div>
      {#if s.readingKind !== 'words' && s.readingScript !== 'both'}
        <p class="muted small">{t('reading.mixedHint')}</p>
      {/if}
    </div>
    <label class="switch"
      ><span>{t('reading.spaces')}</span><input
        type="checkbox"
        bind:checked={s.readingSpaces}
      /></label
    >
    <div class="field">
      <span class="label">{t('reading.countLabel')}</span>
      <div class="segmented" role="group" aria-label={t('reading.countLabel')}>
        {#each READING_COUNTS as n (n)}
          <button
            aria-pressed={count === n}
            aria-label={n ? undefined : t('reading.noLimit')}
            title={n ? undefined : t('reading.noLimit')}
            onclick={() => (s.readingCount = n)}>{n || '∞'}</button
          >
        {/each}
      </div>
    </div>
    <div class="go">
      <span class="muted">
        {pool.length
          ? t('reading.counts', { due: counts.due, new: counts.new, count: pool.length })
          : unlocked.length
            ? t('reading.noWordsScript')
            : t('reading.noWords')}
      </span>
      <button class="btn primary" disabled={!pool.length} onclick={start}
        >{t('reading.startBtn')} <kbd>Enter</kbd></button
      >
    </div>
  </section>

  {#if locked.length}
    <section class="panel block">
      <h2>{t('reading.nextToUnlock')}</h2>
      <ul class="next">
        {#each locked.slice(0, 8) as { w, missing } (w.kana)}
          <li>
            <button class="word" lang="ja" onclick={() => openWord(w, missing)}
              >{wordText(w, s.readingSpaces)}</button
            >
            <span class="muted">{t('reading.needs')}</span>
            <span lang="ja" class="missing">
              {glyphsText(missing)}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="panel block">
    <h2>{t('wordList.heading')}</h2>
    <WordList
      {unlocked}
      missing={(w) => missingKana(store.data, w)}
      onopen={(w, missing) => openWord(w, missing)}
    />
  </section>
{:else if phase === 'card' && current}
  {@const word = current}
  <div class="reading">
    <SessionTopbar
      title={t('reading.sessionTitle')}
      onleave={leave}
      progress={limit ? (answered + (flipped ? 1 : 0)) / limit : undefined}
    >
      <button
        class="btn icon ghost"
        onclick={undoLast}
        disabled={!canUndo}
        aria-label={t('common.undo')}
        title={t('common.undo')}
      >
        <Icon name="undo" />
      </button>
      <span class="muted"
        >{limit ? `${answered + 1} / ${limit}` : t('reading.answered', { count: answered })}</span
      >
    </SessionTopbar>

    {#key shown}
      <div in:fly={{ y: 20, duration: 380 }}>
        <PaperCard
          {flipped}
          {tilt}
          {paper}
          label={flipped ? `${t('reading.cardLabel')}, ${word.romaji}` : t('reading.cardLabel')}
          onflip={() => (typed ? inputEl?.focus() : reveal())}
        >
          {#snippet front()}
            <WordText {word} {font} max="5rem" phraseMax="3.6rem" spaces={s.readingSpaces} />
            <span class="muted hint"
              >{word.kind === 'phrase'
                ? t('reading.phrase')
                : word.script === 'katakana'
                  ? t('reading.kataWord')
                  : t('reading.hiraWord')}</span
            >
          {/snippet}
          {#snippet back()}
            <WordText {word} {font} max="2.4rem" phraseMax="2rem" spaces={s.readingSpaces} />
            {#if verdict !== undefined}
              <p class="verdict" class:wrong={!verdict}>
                {verdict ? t('reading.correct') : t('reading.youTyped', { input })}
              </p>
            {/if}
            <p class="romaji" class:phrase={word.kind === 'phrase'}>{word.romaji}</p>
            <p class="meaning">{wordMeaning(word, lang())}</p>
            <button
              class="btn small listen"
              onclick={(e) => {
                e.stopPropagation()
                audio.playWord(word.index, voice)
              }}
              aria-label={t('reading.listenLabel')}
              ><Icon name="play" size={14} filled /> {t('common.listen')}</button
            >
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class="parts" onclick={(e) => e.stopPropagation()}>
              {#each parts as p, i (i)}
                {#if p.kana}
                  <button
                    class="part"
                    class:gap={p.gap && s.readingSpaces}
                    onclick={() => p.kana && audio.playVoice(p.kana.id, voice)}
                    title={p.kana.romaji}
                  >
                    <span lang="ja">{p.text}</span>
                    <small>{p.kana.romaji}</small>
                  </button>
                {:else}
                  <span class="part mark" class:gap={p.gap && s.readingSpaces}
                    ><span lang="ja">{p.text}</span><small
                      >{p.text === 'ー'
                        ? t('word.long')
                        : p.text === 'っ' || p.text === 'ッ'
                          ? t('word.pause')
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
            placeholder={t('reading.inputPlaceholder')}
            aria-label={t('reading.inputLabel')}
          />
          <button class="btn primary" type="submit">{t('reading.check')}</button>
        </form>
      {:else if !flipped}
        <button class="btn primary" onclick={reveal}
          >{t('reading.showReading')} <kbd>Space</kbd></button
        >
      {:else}
        <div class="grades" role="group" aria-label={t('study.card.gradeLabel')}>
          {#each [1, 2, 3, 4] as const as g (g)}
            <button
              class="btn grade g{g}"
              class:suggested={suggested === g}
              onclick={() => grade(g)}
            >
              <span class="label">{t(`grade.${g}` as MessageKey)}</span>
              {#if intervals}<span class="interval">{formatInterval(intervals[g], lang())}</span
                >{/if}
              <kbd>{g}</kbd>
            </button>
          {/each}
        </div>
        {#if suggested}<p class="muted small">{t('study.card.enterHint')}</p>{/if}
      {/if}
    </div>

    {#if flipped && word.rules.length}
      <aside class="note panel" in:fly={{ y: 8 }}>
        <h3>{t('reading.rulesHeading')}</h3>
        <RuleList rules={word.rules} open={newRules} />
      </aside>
    {/if}
  </div>
{:else if phase === 'done'}
  <section class="panel block done">
    <p class="eyebrow">{t('reading.doneEyebrow')}</p>
    <h2>{t('reading.doneScore', { score, total: results.length })}</h2>
    {#if missed.length}
      <h3>{t('reading.missedHeading')}</h3>
      <ul class="missed-words">
        {#each missed as w (w.kana)}
          <li>
            <button onclick={() => openWord(w)}>
              <span lang="ja" class="kana">{w.kana}</span>
              <span class="romaji-small">{w.romaji}</span>
              <span class="muted">{wordMeaning(w, lang())}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="row">
      <button class="btn primary" onclick={start}>{t('reading.anotherRound')}</button>
      <button class="btn" onclick={() => (phase = 'overview')}>{t('reading.overview')}</button>
    </div>
  </section>
{/if}

{#if opened}
  <Modal bind:open={wordOpen} title={opened.word.kana}>
    <WordCard word={opened.word} missing={opened.missing} />
  </Modal>
{/if}

<style>
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

  .setup {
    display: grid;
    gap: 1rem;
  }

  .setup h2 {
    margin: 0;
  }

  .field {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }

  .field .segmented {
    flex-wrap: wrap;
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

  button.word {
    padding: 0.1rem 0.4rem;
    border: 0;
    border-radius: 999px;
    background: none;
    color: inherit;
    cursor: pointer;
    font-family: var(--font-kana);
    font-size: 1.05rem;
  }

  button.word:hover {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
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

  .romaji.phrase {
    font-size: 1.6rem;
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

  .part.gap {
    margin-left: 0.6rem;
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

  .done h3 {
    margin: 1rem 0 0.4rem;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
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

  .controls {
    min-height: 60px;
    width: min(92vw, 420px);
    display: grid;
    justify-items: center;
    gap: 0.4rem;
  }

  .grades {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    width: 100%;
  }

  .grade {
    flex-direction: column;
    gap: 0.05rem;
    border-radius: 14px;
    min-height: 64px;
    padding: 0.4rem;
  }

  .grade .label {
    font-weight: 650;
    color: inherit;
    font-size: inherit;
  }

  .grade .interval {
    font-size: 0.75rem;
    color: var(--ink-faint);
    font-weight: 500;
  }

  .grade kbd {
    display: none;
  }

  @media (hover: hover) {
    .grade kbd {
      display: inline;
      margin-top: 0.15rem;
    }
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

  .small {
    font-size: 0.8rem;
    margin: 0;
  }

  .missed-words {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
    display: grid;
    gap: 0.25rem;
  }

  .missed-words button {
    display: flex;
    gap: 0.7rem;
    align-items: baseline;
    width: 100%;
    padding: 0.3rem 0.5rem;
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .missed-words button:hover {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }

  .missed-words .kana {
    font-family: var(--font-kana);
    font-size: 1.25rem;
  }

  .romaji-small {
    font-weight: 600;
  }

  .done {
    max-width: 560px;
    margin: 0 auto;
  }
</style>
