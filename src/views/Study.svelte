<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte'
  import { fly } from 'svelte/transition'
  import FlashCard from '../components/FlashCard.svelte'
  import FontGallery from '../components/FontGallery.svelte'
  import Icon from '../components/Icon.svelte'
  import Modal from '../components/Modal.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import type { VoiceId } from '../lib/audio/voices'
  import { FONTS, randomFontId } from '../lib/data/fonts'
  import { BASIC_ROWS, kanaById, rowsOf, type Kana, type KanaGroup } from '../lib/data/kana'
  import {
    Session,
    deckKana,
    formatInterval,
    previewIntervals,
    startOfNextDay,
  } from '../lib/srs/scheduler'
  import { STUDY_DECKS, type Grade, type StudyDeckId } from '../lib/storage/schema'
  import { logPractice, recordReview } from '../lib/study/actions'
  import { isStreakMilestone, rowMastered } from '../lib/study/milestones'
  import { streak as dayStreak } from '../lib/study/stats'
  import { GRADE_LABELS, checkKana, kanaForAnswer, suggestGrade } from '../lib/study/answer'
  import { DECK_INFO, queueFor } from '../lib/study/summary'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, settings, store } from '../state/app.svelte'
  import { navigate, route } from '../state/router.svelte'
  import { nextPhoto, toast, ui } from '../state/ui.svelte'

  const deckParam = route.segments[1] as StudyDeckId | undefined
  const deck: StudyDeckId = deckParam && STUDY_DECKS.includes(deckParam) ? deckParam : 'hiragana'
  const mode: 'srs' | 'order' = route.query.mode === 'order' ? 'order' : 'srs'
  const s = settings()
  const typed = $derived(settings().answerStyle === 'typed')
  const info = DECK_INFO[deck]
  const pool = deckKana(deck, s.groups)

  // ── Session state ──────────────────────────────────────────────────────────
  let phase = $state<'setup' | 'card' | 'done'>('card')
  let current = $state<Kana | undefined>()
  let currentIsNew = $state(false)
  let flipped = $state(false)
  let font = $state(s.font)
  /** Voice for the current card, picked once per card (matters for the "random" setting). */
  let voice: VoiceId = audio.pickVoice()
  let tilt = $state(0)
  /** Each card gets its own sheet of paper. */
  let paper = $state(0)
  let startedAt = 0
  let input = $state('')
  let verdict = $state<{ correct: boolean; typed: string } | undefined>()
  let suggested = $state<Grade | undefined>()
  let celebrate = $state(false)
  let busy = false
  let sincePhoto = 0
  let answered = $state(0)
  /** Cards seen in order mode, whether or not they were self-checked. */
  let viewed = $state(0)
  let correctCount = $state(0)
  let sessionStart = Date.now()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)
  let inputEl = $state<HTMLInputElement>()

  // SRS
  let session: Session | undefined
  let intervals = $state<Record<Grade, number> | undefined>()
  /** Session counters for the progress bar: share seen, cards not seen yet, cards coming back. */
  let counts = $state({ progress: 0, unseen: 0, repeating: 0 })

  function syncCounts() {
    if (session) {
      counts = { progress: session.progress, unseen: session.unseen, repeating: session.repeating }
    }
  }

  // In order
  let orderList = $state<Kana[]>([])
  let orderIndex = $state(0)
  let pass = $state(1)
  let loop = $state(route.query.loop === '1')
  const groupsWithRows: KanaGroup[] = (
    ['basic', 'dakuten', 'yoon', 'extended'] as KanaGroup[]
  ).filter((g) => s.groups.includes(g))
  const rowOptions = groupsWithRows.flatMap((g) =>
    rowsOf(g)
      .map((r) => ({ ...r, kana: r.kana.filter((k) => pool.includes(k)) }))
      .filter((r) => r.kana.length > 0)
      .map((r) => ({ key: `${g}:${r.row}`, group: g, row: r.row, kana: r.kana })),
  )
  let selectedRows = $state<string[]>(
    route.query.rows
      ? route.query.rows.split(',')
      : rowOptions
          .filter((r) => r.group === 'basic' && BASIC_ROWS.slice(0, 2).includes(r.row))
          .map((r) => r.key),
  )

  onMount(() => {
    ui.focus = true
    if (mode === 'srs') startSrs()
    else if (route.query.ids) startOrder(idsFromQuery())
    else phase = 'setup'
  })

  onDestroy(() => {
    ui.focus = false
  })

  function idsFromQuery(): Kana[] {
    return (route.query.ids ?? '')
      .split(',')
      .map((id) => {
        try {
          return kanaById(id)
        } catch {
          return undefined
        }
      })
      .filter((k): k is Kana => !!k)
  }

  function startSrs() {
    const queue = queueFor(store.data, deck)
    session = new Session(queue)
    syncCounts()
    void showNext()
  }

  function startOrder(list: Kana[]) {
    orderList = list
    orderIndex = 0
    pass = 1
    phase = 'card'
    if (!list.length) {
      phase = 'setup'
      return
    }
    void show(list[0], false)
  }

  function startOrderFromRows() {
    const keys = new Set(selectedRows)
    const list = rowOptions.filter((r) => keys.has(r.key)).flatMap((r) => r.kana)
    startOrder(list)
  }

  async function show(kana: Kana, isNew: boolean) {
    const nextFont =
      settings().fontMode === 'random'
        ? randomFontId(settings().randomFonts, font)
        : settings().font
    await loadFontWithin(nextFont)
    flipped = false
    verdict = undefined
    suggested = undefined
    celebrate = false
    input = ''
    font = nextFont
    voice = audio.pickVoice()
    tilt = (Math.random() - 0.5) * 1.4
    paper = Math.floor(Math.random() * 2 ** 31)
    current = kana
    currentIsNew = isNew
    phase = 'card'
    startedAt = performance.now()
    if (mode === 'srs') {
      intervals = previewIntervals(store.data.cards[deck]?.[kana.id])
    }
    busy = false
    await tick()
    if (typed) inputEl?.focus()
  }

  async function showNext() {
    if (!session) return
    const id = session.next()
    syncCounts()
    if (!id) return finish()
    await show(kanaById(id), session.isNew(id))
  }

  function finish() {
    if (mode === 'order' && flipped) viewed++
    phase = 'done'
    current = undefined
    if (answered === 0 && viewed === 0) return
    void audio.playSfx('complete')
    const before = dayStreak(store.data.log.filter((e) => e.t < sessionStart)).current
    const after = dayStreak(store.data.log).current
    if (after > before && isStreakMilestone(after)) {
      setTimeout(() => void audio.playSfx('milestone'), 900)
      toast(`${after}-day streak — keep it up!`)
    }
  }

  function reveal() {
    if (!current || flipped) return
    flipped = true
    void audio.playSfx('flip')
    const id = current.id
    // Only play if the same card is still showing (a fast grade may already have moved on).
    if (settings().autoplay) {
      setTimeout(() => current?.id === id && flipped && audio.playVoice(id, voice), 280)
    }
  }

  function submitTyped() {
    if (!current || flipped) return
    const ms = performance.now() - startedAt
    const correct = checkKana(current, input)
    verdict = { correct, typed: input.trim() }
    suggested = suggestGrade(correct, ms)
    reveal()
    if (mode === 'order') {
      recordPractice(correct, suggested)
    }
  }

  function advancePhoto() {
    sincePhoto++
    if (sincePhoto >= settings().photoEvery) {
      sincePhoto = 0
      nextPhoto()
    }
  }

  async function grade(g: Grade) {
    if (!current || !session || !flipped || busy) return
    busy = true
    const ms = performance.now() - startedAt
    const typedWrong = verdict && !verdict.correct
    const answerKana = typedWrong ? kanaForAnswer(verdict!.typed, pool) : undefined
    const result = recordReview(store.data, {
      deck,
      id: current.id,
      grade: g,
      ms,
      correct: verdict ? verdict.correct : g > 1,
      answer: answerKana?.id,
    })
    session.answer(current.id, result.after)
    answered++
    if (g > 1) correctCount++
    void audio.playGrade(g)
    advancePhoto()
    if (result.becameMature) {
      celebrate = true
      setTimeout(() => void audio.playSfx('stamp'), 120)
      setTimeout(() => void audio.playSfx('bell'), 520)
      const row = rowMastered(store.data, deck, current.id)
      if (row) {
        const first = kanaById(row[0])
        const name = deck === 'katakana' ? first.katakana : first.hiragana
        setTimeout(() => void audio.playSfx('milestone'), 1100)
        toast(`You've mastered the ${name} row! 🎉`)
      }
      await new Promise((r) => setTimeout(r, 1300))
    } else {
      await new Promise((r) => setTimeout(r, 160))
    }
    await showNext()
  }

  /** Log an in-order answer. Without a grade (self-check), right sounds like Good, wrong like Again. */
  function recordPractice(correct: boolean, grade: Grade = correct ? 3 : 1) {
    if (!current) return
    logPractice(store.data, {
      mode: 'order',
      deck,
      id: current.id,
      correct,
      ms: performance.now() - startedAt,
      ...(verdict && !verdict.correct ? { answer: kanaForAnswer(verdict.typed, pool)?.id } : {}),
    })
    answered++
    if (correct) correctCount++
    void audio.playGrade(grade)
  }

  function selfCheck(correct: boolean) {
    if (!flipped) return
    recordPractice(correct)
    move(1)
  }

  function move(delta: number) {
    if (mode !== 'order' || !orderList.length) return
    let next = orderIndex + delta
    if (next >= orderList.length) {
      if (!loop) return finish()
      next = 0
      pass++
    }
    if (next < 0) next = 0
    if (delta > 0 && flipped) viewed++
    orderIndex = next
    advancePhoto()
    void show(orderList[next], false)
  }

  function exit() {
    navigate('/')
  }

  function onKeydown(e: KeyboardEvent) {
    if (phase !== 'card' || strokesOpen || fontsOpen) {
      if (e.key === 'Escape' && phase !== 'card') exit()
      return
    }
    const inInput = (e.target as HTMLElement).tagName === 'INPUT'
    if (e.key === 'Escape') return exit()
    if (inInput && !flipped) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === ' ' || (key === 'enter' && !typed)) {
      e.preventDefault()
      if (!flipped) reveal()
      else if (mode === 'srs' && key === 'enter' && suggested) void grade(suggested)
      else if (mode === 'order' && key === ' ') move(1)
      return
    }
    if (key === 'enter' && flipped) {
      e.preventDefault()
      if (mode === 'srs') void grade(suggested ?? 3)
      else move(1)
      return
    }
    if (key === 'p' && current) void audio.playVoice(current.id, voice)
    else if (key === 's') strokesOpen = true
    else if (key === 'f') fontsOpen = true
    else if (mode === 'srs' && ['1', '2', '3', '4'].includes(key)) void grade(Number(key) as Grade)
    else if (mode === 'order' && key === 'arrowright') move(1)
    else if (mode === 'order' && key === 'arrowleft') move(-1)
    else if (mode === 'order' && flipped && !typed && key === '1') selfCheck(false)
    else if (mode === 'order' && flipped && !typed && key === '2') selfCheck(true)
  }

  // Swipe left/right in order mode.
  let touchX: number | undefined
  function onTouchStart(e: TouchEvent) {
    touchX = e.touches[0]?.clientX
  }
  function onTouchEnd(e: TouchEvent) {
    if (touchX === undefined || mode !== 'order') return
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
    if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1)
    touchX = undefined
  }

  const progress = $derived(
    mode === 'srs'
      ? counts.progress
      : orderList.length
        ? (orderIndex + (flipped ? 1 : 0)) / orderList.length
        : 0,
  )
  const nextDue = $derived.by(() => {
    if (phase !== 'done') return undefined
    const cards = Object.values(untrack(() => store.data.cards[deck]) ?? {})
    const upcoming = cards.filter((c) => c.state !== 0).map((c) => c.due)
    return upcoming.length ? Math.min(...upcoming) : undefined
  })
  const minutes = $derived(Math.max(1, Math.round((Date.now() - sessionStart) / 60000)))
</script>

<svelte:window onkeydown={onKeydown} />

<div class="study" ontouchstart={onTouchStart} ontouchend={onTouchEnd} role="presentation">
  <div class="topbar panel">
    <button
      class="btn icon ghost"
      onclick={exit}
      aria-label="Leave session (Esc)"
      title="Leave (Esc)"
    >
      <Icon name="close" />
    </button>
    <div class="title">
      <strong>{info.title}</strong>
      <span class="muted"
        >{mode === 'srs'
          ? 'Spaced repetition'
          : `In order${pass > 1 ? ` · pass ${pass}` : ''}`}</span
      >
    </div>
    <div
      class="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span style:width="{progress * 100}%"></span>
    </div>
    <span class="count">
      {#if mode === 'srs'}{counts.unseen} left{#if counts.repeating}
          · <span title="Cards you're still learning come back in a few minutes"
            >{counts.repeating} again</span
          >{/if}{:else if orderList.length}{orderIndex + 1} / {orderList.length}{/if}
    </span>
  </div>

  {#if phase === 'setup'}
    <section class="setup panel" in:fly={{ y: 12 }}>
      <h2>Study in order</h2>
      <p class="muted">
        Go through the kana one by one, in table order. This doesn't affect your spaced-repetition
        schedule.
      </p>
      <div class="rows">
        {#each rowOptions as r (r.key)}
          <label class="row-chip" class:on={selectedRows.includes(r.key)}>
            <input
              type="checkbox"
              checked={selectedRows.includes(r.key)}
              onchange={(e) => {
                const on = (e.currentTarget as HTMLInputElement).checked
                selectedRows = on
                  ? [...selectedRows, r.key]
                  : selectedRows.filter((k) => k !== r.key)
              }}
            />
            <span lang="ja">{deck === 'katakana' ? r.kana[0].katakana : r.kana[0].hiragana}</span>
            <small>{r.kana[0].romaji}…</small>
          </label>
        {/each}
      </div>
      <div class="setup-actions">
        <button
          class="btn small ghost"
          onclick={() => (selectedRows = rowOptions.map((r) => r.key))}>Select all</button
        >
        <button class="btn small ghost" onclick={() => (selectedRows = [])}>Clear</button>
        <label class="switch inline"
          ><span>Loop</span><input type="checkbox" bind:checked={loop} /></label
        >
        <button class="btn primary" disabled={!selectedRows.length} onclick={startOrderFromRows}>
          Start · {rowOptions
            .filter((r) => selectedRows.includes(r.key))
            .reduce((n, r) => n + r.kana.length, 0)} kana
        </button>
      </div>
    </section>
  {:else if phase === 'card' && current}
    <div class="stage">
      {#key current.id + pass}
        <div class="card-wrap" in:fly={{ y: 24, duration: 420 }}>
          <FlashCard
            kana={current}
            {deck}
            {font}
            {flipped}
            {tilt}
            {paper}
            isNew={currentIsNew}
            {celebrate}
            {verdict}
            onflip={() => (typed ? inputEl?.focus() : reveal())}
            onplay={() => current && audio.playVoice(current.id, voice)}
            onstrokes={() => (strokesOpen = true)}
            onfonts={() => (fontsOpen = true)}
          />
        </div>
      {/key}

      <div class="controls">
        {#if typed && !flipped}
          <form
            class="typed"
            onsubmit={(e) => {
              e.preventDefault()
              submitTyped()
            }}
          >
            <input
              bind:this={inputEl}
              bind:value={input}
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="Type the romaji…"
              aria-label="Your answer in romaji"
            />
            <button class="btn primary" type="submit">Check</button>
          </form>
        {:else if mode === 'srs' && !flipped}
          <button class="btn primary wide" onclick={reveal}>Show answer <kbd>Space</kbd></button>
        {:else if mode === 'srs'}
          <div class="grades" role="group" aria-label="How well did you know it?">
            {#each [1, 2, 3, 4] as const as g (g)}
              <button
                class="btn grade g{g}"
                class:suggested={suggested === g}
                onclick={() => grade(g)}
              >
                <span class="label">{GRADE_LABELS[g]}</span>
                {#if intervals}<span class="interval">{formatInterval(intervals[g])}</span>{/if}
                <kbd>{g}</kbd>
              </button>
            {/each}
          </div>
          {#if suggested}<p class="muted small">
              Press <kbd>Enter</kbd> to accept the suggested grade.
            </p>{/if}
        {:else}
          <div class="order-nav">
            <button
              class="btn"
              onclick={() => move(-1)}
              disabled={orderIndex === 0}
              aria-label="Previous (←)"
            >
              <Icon name="left" />
            </button>
            {#if !flipped}
              <button class="btn primary wide" onclick={reveal}>Show answer <kbd>Space</kbd></button
              >
            {:else if !typed}
              <button class="btn missed" onclick={() => selfCheck(false)}
                >Missed <kbd>1</kbd></button
              >
              <button class="btn got" onclick={() => selfCheck(true)}>Got it <kbd>2</kbd></button>
            {/if}
            <button
              class="btn"
              class:primary={flipped}
              onclick={() => move(1)}
              aria-label="Next (→)"
            >
              <Icon name="right" />
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else if phase === 'done'}
    <section class="done panel" in:fly={{ y: 12 }}>
      <p class="eyebrow">おつかれさま · Well done</p>
      {#if answered === 0 && mode === 'srs'}
        <h2>Nothing to study right now</h2>
        <p>
          You've done all reviews and new cards for today in this deck.
          {#if nextDue}The next review is due
            {nextDue < startOfNextDay(Date.now())
              ? `in ${formatInterval(Math.max(60_000, nextDue - Date.now()))}`
              : `on ${new Date(nextDue).toLocaleDateString()}`}.{/if}
        </p>
      {:else}
        <h2>Session complete</h2>
        <dl class="summary">
          <div>
            <dt>Cards</dt>
            <dd>{mode === 'order' ? Math.max(viewed, answered) : answered}</dd>
          </div>
          <div>
            <dt>Correct</dt>
            <dd>{answered ? `${Math.round((correctCount / answered) * 100)}%` : '—'}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{minutes} min</dd>
          </div>
        </dl>
      {/if}
      <div class="done-actions">
        <a class="btn primary" href="#/">Back home</a>
        <a class="btn" href="#/study/{deck}?mode=order">Study in order</a>
        <a class="btn" href="#/table">Kana table</a>
        <a class="btn" href="#/practice">Practice</a>
      </div>
    </section>
  {/if}
</div>

{#if current}
  <Modal bind:open={strokesOpen} title="Stroke order">
    <StrokeOrder
      text={deck === 'combined'
        ? current.hiragana
        : deck === 'katakana'
          ? current.katakana
          : current.hiragana}
    />
    {#if deck === 'combined'}
      <StrokeOrder text={current.katakana} />
    {/if}
  </Modal>
  <Modal bind:open={fontsOpen} title="Font gallery" wide>
    <FontGallery
      text={deck === 'combined'
        ? current.hiragana + current.katakana
        : deck === 'katakana'
          ? current.katakana
          : current.hiragana}
      fonts={FONTS.map((f) => f.id)}
      current={font}
    />
  </Modal>
{/if}

<style>
  .study {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    margin-top: -0.5rem;
  }

  .topbar {
    width: min(100%, 720px);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 1rem 0.35rem 0.35rem;
  }

  .title {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }

  .title .muted {
    font-size: 0.78rem;
  }

  .progress {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ink) 10%, transparent);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    background: var(--shu);
    border-radius: inherit;
    transition: width 0.5s var(--ease);
  }

  .count {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
    white-space: nowrap;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
  }

  .card-wrap {
    display: grid;
    place-items: center;
  }

  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: min(100%, 560px);
    min-height: 76px;
  }

  .wide {
    min-width: 240px;
  }

  .typed {
    display: flex;
    gap: 0.5rem;
    width: min(100%, 420px);
  }

  .typed input {
    flex: 1;
    font-size: 1.15rem;
    text-align: center;
    border-radius: 999px;
    padding-inline: 1.2rem;
    box-shadow: var(--shadow-soft);
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

  .order-nav {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .missed {
    border-bottom: 3px solid var(--shu);
  }

  .got {
    border-bottom: 3px solid var(--level-young);
  }

  .setup,
  .done {
    width: min(100%, 720px);
    padding: 1.5rem;
  }

  .rows {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .row-chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    cursor: pointer;
    min-width: 56px;
    background: color-mix(in srgb, var(--paper) 50%, transparent);
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .row-chip input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .row-chip span {
    font-family: var(--font-kana);
    font-size: 1.4rem;
    line-height: 1.2;
  }

  .row-chip small {
    font-size: 0.7rem;
    color: var(--ink-faint);
  }

  .row-chip.on {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }

  .row-chip.on small {
    color: color-mix(in srgb, var(--paper) 70%, transparent);
  }

  .row-chip:focus-within {
    outline: 2px solid var(--ai);
    outline-offset: 2px;
  }

  .setup-actions,
  .done-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .setup-actions .primary {
    margin-left: auto;
  }

  .switch.inline {
    gap: 0.6rem;
    min-height: 34px;
    font-size: 0.9rem;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 1rem 0 1.5rem;
  }

  .summary dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }

  .summary dd {
    margin: 0;
    font-size: 2rem;
    font-family: var(--font-heading);
  }
</style>
