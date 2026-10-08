<script lang="ts">
  import { fly } from 'svelte/transition'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import { confusableSets, type ConfusableSet } from '../lib/data/confusables'
  import { randomFontId } from '../lib/data/fonts'
  import { logPractice } from '../lib/study/actions'
  import { drillDeck, kanaOf, personalSets, quizOptions, quizRounds } from '../lib/study/drills'
  import { confusions } from '../lib/study/stats'
  import { loadFontWithin } from '../lib/ui/fontLoader'
  import { audio, settings, store } from '../state/app.svelte'
  import { navigate, route } from '../state/router.svelte'

  const mine = $derived(personalSets(confusions(store.data.log, 6)))
  const all = $derived([...mine, ...confusableSets])
  const setId = $derived(route.segments[1])
  const set = $derived(all.find((s) => s.id === setId))

  const SECTIONS: { title: string; filter: (s: ConfusableSet) => boolean }[] = [
    { title: 'Katakana', filter: (s) => s.script === 'katakana' && !s.id.startsWith('mine') },
    { title: 'Hiragana', filter: (s) => s.script === 'hiragana' && !s.id.startsWith('mine') },
    { title: 'Hiragana or katakana?', filter: (s) => s.script === 'mixed' },
  ]

  // ── Quiz state ────────────────────────────────────────────────────────────
  let step = $state<'compare' | 'quiz' | 'result'>('compare')
  let rounds = $state<string[]>([])
  let index = $state(0)
  let picked = $state<string | undefined>()
  let score = $state(0)
  let font = $state(settings().font)
  let startedAt = 0

  $effect(() => {
    void setId
    step = 'compare'
  })

  async function startQuiz() {
    if (!set) return
    rounds = quizRounds(set, Math.max(10, set.chars.length * 4))
    index = 0
    score = 0
    step = 'quiz'
    await nextRound(0)
  }

  async function nextRound(i: number) {
    picked = undefined
    const s = settings()
    const f = s.fontMode === 'random' ? randomFontId(s.randomFonts, font) : s.font
    await loadFontWithin(f)
    font = f
    index = i
    startedAt = performance.now()
  }

  function answer(char: string) {
    if (!set || picked) return
    picked = char
    const target = rounds[index]
    const correct = char === target
    if (correct) {
      score++
    }
    // Right or wrong only: right sounds like Good, wrong like Again.
    void audio.playGrade(correct ? 3 : 1)
    logPractice(store.data, {
      mode: 'confusable',
      deck: drillDeck(set, target),
      id: kanaOf(target).id,
      correct,
      ms: performance.now() - startedAt,
      answer: kanaOf(char).id,
    })
    setTimeout(
      () => {
        if (index + 1 >= rounds.length) {
          step = 'result'
          void audio.playSfx(score === rounds.length ? 'milestone' : 'complete')
        } else void nextRound(index + 1)
      },
      correct ? 650 : 1600,
    )
  }

  function onKeydown(e: KeyboardEvent) {
    if (!set || step !== 'quiz' || picked) return
    const n = Number(e.key)
    const options = quizOptions(set)
    if (n >= 1 && n <= options.length) answer(options[n - 1].char)
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if !set}
  <header class="page-head">
    <p class="eyebrow light">似ている字 · Look-alikes</p>
    <h1>Confusable pairs</h1>
    <p class="lead">Kana that look alike, side by side. Compare them, then test yourself.</p>
  </header>

  {#if mine.length}
    <section class="section">
      <h2 class="section-title">From your mistakes</h2>
      <div class="sets">
        {#each mine as s (s.id)}
          <a class="set panel mine" href="#/drills/{s.id}">
            <span class="chars" lang="ja">{s.chars.join(' ')}</span>
            <span class="muted">{s.hints[s.chars[0]]}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#each SECTIONS as section (section.title)}
    <section class="section">
      <h2 class="section-title">{section.title}</h2>
      <div class="sets">
        {#each confusableSets.filter(section.filter) as s (s.id)}
          <a class="set panel" href="#/drills/{s.id}">
            <span class="chars" lang="ja">{s.chars.join(' ')}</span>
            <span class="muted">{s.chars.map((c) => kanaOf(c).romaji).join(' · ')}</span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
{:else}
  <div class="drill">
    <div class="topbar panel">
      <button
        class="btn icon ghost"
        onclick={() => navigate('/drills')}
        aria-label="Back to all sets"
      >
        <Icon name="left" />
      </button>
      <strong lang="ja">{set.title}</strong>
      {#if step === 'quiz'}
        <span class="progress" style:--p={(index + (picked ? 1 : 0)) / rounds.length}></span>
        <span class="muted count">{index + 1} / {rounds.length}</span>
      {/if}
    </div>

    {#if step === 'compare'}
      <section class="compare" in:fly={{ y: 12 }}>
        {#each set.chars as c (c)}
          {@const k = kanaOf(c)}
          <article class="item panel">
            <div class="big washi">
              <KanaGlyph text={c} font={settings().font} size="6.5rem" />
            </div>
            <p class="romaji">
              {k.romaji}
              {#if set.script === 'mixed'}<span class="chip"
                  >{c.codePointAt(0)! >= 0x30a0 ? 'katakana' : 'hiragana'}</span
                >{/if}
            </p>
            <p class="hint">{set.hints[c]}</p>
            <div class="row">
              <button class="btn small" onclick={() => audio.playVoice(k.id)}>
                <Icon name="play" size={14} filled /> Listen
              </button>
            </div>
            <StrokeOrder text={c} size={120} />
          </article>
        {/each}
      </section>
      <div class="cta">
        <button class="btn primary" onclick={startQuiz}>Test yourself</button>
      </div>
    {:else if step === 'quiz'}
      {@const target = rounds[index]}
      {#key index}
        <section class="quiz" in:fly={{ y: 16, duration: 300 }}>
          <div class="question washi">
            <KanaGlyph text={target} {font} size="8rem" />
          </div>
          <div class="options" role="group" aria-label="Which one is it?">
            {#each quizOptions(set) as o, i (o.char)}
              <button
                class="btn option"
                class:right={picked && o.char === target}
                class:wrong={picked === o.char && o.char !== target}
                disabled={!!picked}
                onclick={() => answer(o.char)}
              >
                {o.label}
                <kbd>{i + 1}</kbd>
              </button>
            {/each}
          </div>
          {#if picked && picked !== target}
            <p class="hint feedback" in:fly={{ y: 6 }}>{set.hints[target]}</p>
          {/if}
        </section>
      {/key}
    {:else}
      <section class="result panel" in:fly={{ y: 12 }}>
        <p class="eyebrow">結果 · Result</p>
        <h2>{score} / {rounds.length} correct</h2>
        <p class="muted">
          {score === rounds.length
            ? 'Perfect — you can tell these apart.'
            : score / rounds.length >= 0.8
              ? 'Nearly there. One more round?'
              : 'These are tricky. Look at the hints again, then try once more.'}
        </p>
        <div class="row">
          <button class="btn primary" onclick={startQuiz}>Again</button>
          <button class="btn" onclick={() => (step = 'compare')}>Compare again</button>
          <a class="btn" href="#/drills">All sets</a>
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
    max-width: 52ch;
  }

  .section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    color: #fff;
    text-shadow: 0 1px 8px rgb(0 0 0 / 0.5);
    font-size: 1.15rem;
  }

  .sets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 0.75rem;
  }

  .set {
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    color: var(--ink);
    text-decoration: none;
    transition:
      transform 0.2s var(--ease),
      box-shadow 0.2s;
  }

  .set:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  .set.mine {
    border-left: 4px solid var(--shu);
  }

  .set .chars {
    font-family: var(--font-kana);
    font-size: 1.9rem;
    letter-spacing: 0.08em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  .set .muted {
    font-size: 0.8rem;
  }

  .drill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .topbar {
    width: min(100%, 860px);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 1rem 0.35rem 0.35rem;
  }

  .progress {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--shu) calc(var(--p) * 100%),
      color-mix(in srgb, var(--ink) 10%, transparent) 0
    );
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .compare {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    width: min(100%, 860px);
  }

  .item {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4rem;
  }

  .big {
    width: 150px;
    height: 150px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    box-shadow: var(--shadow-soft);
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 1.8rem;
    margin: 0.3rem 0 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .hint {
    font-size: 0.9rem;
    color: var(--ink-soft);
    margin: 0;
    max-width: 34ch;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .cta {
    margin-top: 0.5rem;
  }

  .quiz {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .question {
    width: min(70vw, 280px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 20px;
    box-shadow: var(--shadow);
    transform: rotate(-0.6deg);
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: center;
  }

  .option {
    min-width: 110px;
    font-size: 1.15rem;
    min-height: 56px;
  }

  .option.right {
    background: var(--level-mature);
    color: #fff;
    border-color: var(--level-mature);
    opacity: 1;
  }

  .option.wrong {
    background: var(--shu);
    color: #fff;
    border-color: var(--shu);
    opacity: 1;
  }

  .feedback {
    background: var(--panel-strong);
    padding: 0.6rem 1rem;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-soft);
  }

  .result {
    width: min(100%, 560px);
    padding: 1.5rem;
  }

  .result .row {
    justify-content: flex-start;
  }
</style>
