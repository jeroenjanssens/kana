<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MasteryBar from '../components/MasteryBar.svelte'
  import { confusableSets } from '../lib/data/confusables'
  import { displayRomaji, glyph, kanaById, kanaByChar, type Kana } from '../lib/data/kana'
  import { Session, deckKana } from '../lib/srs/scheduler'
  import type { VoiceId } from '../lib/audio/voices'
  import type { DeckId } from '../lib/storage/schema'
  import { recordReview } from '../lib/study/actions'
  import { LISTEN_ADVANCE_MS, listenGrade } from '../lib/study/listen'
  import { chooseOptions } from '../lib/study/distractors'
  import { deckSummary, queueFor } from '../lib/study/summary'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, settings, store } from '../state/app.svelte'
  import { navigate, route } from '../state/router.svelte'
  import { nextPhoto, ui } from '../state/ui.svelte'

  const scriptParam = route.segments[1]
  const script =
    scriptParam === 'katakana' ? 'katakana' : scriptParam === 'hiragana' ? 'hiragana' : undefined
  const deck: DeckId | undefined = script ? `listen-${script}` : undefined

  let session: Session | undefined
  let current = $state<Kana | undefined>()
  let options = $state<Kana[]>([])
  let picked = $state<Kana | undefined>()
  let done = $state(false)
  let total = $state(0)
  let remaining = $state(0)
  let answered = $state(0)
  let correctCount = $state(0)
  let startedAt = 0
  /** One voice per card, so replays don't switch speakers ("random" setting). */
  let voice: VoiceId = audio.pickVoice()
  let sincePhoto = 0
  let advance: ReturnType<typeof setTimeout> | undefined

  onMount(() => {
    if (!deck) return
    ui.focus = true
    session = new Session(queueFor(store.data, deck))
    total = session.total
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
    remaining = session.remaining
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
    void audio.playGrade(grade)
    if (correct) {
      correctCount++
    } else {
      setTimeout(() => current && audio.playVoice(current.id, voice), 450)
    }
    if (++sincePhoto >= settings().photoEvery) {
      sincePhoto = 0
      nextPhoto()
    }
    if (correct) {
      // Hear it once more, then move on (Enter, Space or Next skip the wait).
      setTimeout(() => current && picked && audio.playVoice(current.id, voice), 350)
      advance = setTimeout(next, LISTEN_ADVANCE_MS)
    }
  }

  function onKeydown(e: KeyboardEvent) {
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
    <p class="eyebrow light">聞き取り · Listening</p>
    <h1>Listening</h1>
    <p class="lead">
      Hear a sound and pick the kana. Trains the link from sound to shape — with its own
      spaced-repetition schedule.
    </p>
  </header>
  <div class="decks">
    {#each summaries as d (d.deck)}
      {@const isKata = d.deck === 'listen-katakana'}
      <article class="deck panel">
        <div class="head">
          <span class="icon"><Icon name="ear" size={28} /></span>
          <div>
            <h2>{isKata ? 'Katakana' : 'Hiragana'}</h2>
            <p class="muted">{d.total} sounds</p>
          </div>
        </div>
        <p class="counts"><strong>{d.due}</strong> due · <strong>{d.fresh}</strong> new today</p>
        <MasteryBar counts={d.mastery} total={d.total} />
        <a class="btn primary" href="#/listen/{isKata ? 'katakana' : 'hiragana'}">
          {d.due + d.fresh ? `Start · ${d.due + d.fresh}` : 'All done for today'}
        </a>
      </article>
    {/each}
  </div>
{:else}
  <div class="listen">
    <div class="topbar panel">
      <button class="btn icon ghost" onclick={() => navigate('/listen')} aria-label="Leave (Esc)">
        <Icon name="close" />
      </button>
      <strong>Listening · {script === 'katakana' ? 'Katakana' : 'Hiragana'}</strong>
      <span class="bar" style:--p={total ? (total - remaining) / total : 1}></span>
      <span class="muted">{remaining} left</span>
    </div>

    {#if current}
      {#key current.id + answered}
        <section class="stage" in:fly={{ y: 14, duration: 300 }}>
          <button
            class="speaker washi"
            onclick={() => current && audio.playVoice(current.id, voice)}
            aria-label="Play the sound again (P)"
          >
            <Icon name="speaker" size={56} />
            <span class="muted">Play again <kbd>P</kbd></span>
          </button>
          <div class="options" role="group" aria-label="Which kana did you hear?">
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
                <Icon name="play" size={14} filled /> Hear what you picked ({picked.romaji})
              </button>
              <button class="btn primary" onclick={next}>Next <kbd>Enter</kbd></button>
            </div>
          {:else if picked}
            <div class="after">
              <button class="btn" onclick={next}>Next <kbd>Enter</kbd></button>
            </div>
          {/if}
        </section>
      {/key}
    {:else if done}
      <section class="done panel">
        <h2>{answered ? 'Session complete' : 'Nothing to listen to right now'}</h2>
        {#if answered}
          <p>{correctCount} of {answered} correct.</p>
        {:else}
          <p class="muted">You've done all listening reviews for today.</p>
        {/if}
        <div class="row">
          <a class="btn primary" href="#/practice">Back to practice</a>
          <a class="btn" href="#/">Home</a>
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
