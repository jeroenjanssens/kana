<script lang="ts">
  import Forecast from '../components/charts/Forecast.svelte'
  import Heatmap from '../components/charts/Heatmap.svelte'
  import Hanko from '../components/Hanko.svelte'
  import Icon from '../components/Icon.svelte'
  import MasteryBar from '../components/MasteryBar.svelte'
  import { glyph, kanaById } from '../lib/data/kana'
  import { STUDY_DECKS, type DeckId } from '../lib/storage/schema'
  import {
    confusions,
    forecast,
    heatmap,
    performance,
    streak,
    totalAnswers,
    weakest,
  } from '../lib/study/stats'
  import { DECK_INFO, deckSummary } from '../lib/study/summary'
  import { buildHash } from '../lib/ui/hash'
  import { store } from '../state/app.svelte'

  const now = Date.now()
  const log = $derived(store.data.log)
  const s = $derived(streak(log, now))
  const days = $derived(heatmap(log, now))
  const due = $derived(forecast(store.data.cards, now, 14))
  const summaries = $derived(
    ([...STUDY_DECKS, 'listen-hiragana', 'listen-katakana'] as DeckId[]).map((d) =>
      deckSummary(store.data, d, now),
    ),
  )
  const perf = $derived(performance(log, store.data.cards, now))
  const weak = $derived(weakest(perf, 10))
  const mixups = $derived(confusions(log, 8))
  const totals = $derived(totalAnswers(log))
  const timed = $derived(
    perf
      .filter((p) => p.avgMs && p.answers >= 3 && !p.deck.startsWith('listen'))
      .sort((a, b) => (b.avgMs ?? 0) - (a.avgMs ?? 0))
      .slice(0, 8),
  )
  const mastered = $derived(
    STUDY_DECKS.map((d) => summaries.find((x) => x.deck === d)!).reduce(
      (n, x) => n + x.mastery.mature,
      0,
    ),
  )
  const totalCards = $derived(
    STUDY_DECKS.map((d) => summaries.find((x) => x.deck === d)!).reduce((n, x) => n + x.total, 0),
  )

  function scriptFor(deck: DeckId) {
    return deck === 'katakana' || deck === 'listen-katakana' ? 'katakana' : 'hiragana'
  }

  function label(deck: DeckId, id: string) {
    const k = kanaById(id)
    return deck === 'combined'
      ? `${k.hiragana}${k.katakana}`
      : glyph(k, scriptFor(deck)) || k.katakana
  }

  /** In-order drill link for the weakest kana, grouped by deck. */
  const drillLinks = $derived.by(() => {
    const byDeck = new Map<string, string[]>()
    for (const w of weak) {
      const deck = w.deck.startsWith('listen') ? scriptFor(w.deck) : w.deck
      byDeck.set(deck, [...(byDeck.get(deck) ?? []), w.id])
    }
    return [...byDeck].map(([deck, ids]) => ({
      deck,
      href: buildHash(`/study/${deck}`, { mode: 'order', ids: [...new Set(ids)].join(',') }),
    }))
  })
</script>

<header class="page-head">
  <p class="eyebrow light">記録 · Progress</p>
  <h1>Stats</h1>
</header>

<section class="tiles">
  <div class="tile panel">
    <Icon name="flame" size={22} />
    <strong>{s.current}</strong><span>day streak</span>
    <small class="muted">Longest: {s.longest}</small>
  </div>
  <div class="tile panel">
    <Hanko size={26} />
    <strong>{mastered}</strong><span>mastered</span>
    <small class="muted">of {totalCards} cards</small>
  </div>
  <div class="tile panel">
    <Icon name="cards" size={22} />
    <strong>{totals.total}</strong><span>answers</span>
    <small class="muted"
      >{totals.total ? Math.round((totals.correct / totals.total) * 100) : 0}% correct</small
    >
  </div>
  <div class="tile panel">
    <Icon name="chart" size={22} />
    <strong>{due[0]}</strong><span>due today</span>
    <small class="muted">{due.slice(1, 8).reduce((a, b) => a + b, 0)} in the next 7 days</small>
  </div>
</section>

<section class="panel block">
  <h2>Activity</h2>
  <Heatmap {days} />
</section>

<div class="two">
  <section class="panel block">
    <h2>Due in the next two weeks</h2>
    <Forecast counts={due} />
  </section>

  <section class="panel block">
    <h2>Mastery per deck</h2>
    <ul class="decks">
      {#each summaries as d (d.deck)}
        <li>
          <span class="name">{DECK_INFO[d.deck].title}</span>
          <span class="muted">{d.mastery.mature}/{d.total}</span>
          <MasteryBar counts={d.mastery} total={d.total} />
        </li>
      {/each}
    </ul>
  </section>
</div>

<div class="two">
  <section class="panel block">
    <h2>Weakest kana</h2>
    {#if weak.length}
      <ol class="weak">
        {#each weak as w (w.deck + w.id)}
          <li>
            <span class="glyph" lang="ja">{label(w.deck, w.id)}</span>
            <span class="romaji">{kanaById(w.id).romaji}</span>
            <span class="muted small">{DECK_INFO[w.deck].title}</span>
            <span class="acc" class:low={w.accuracy < 0.7} title="Accuracy"
              >{Math.round(w.accuracy * 100)}%</span
            >
          </li>
        {/each}
      </ol>
      <div class="row">
        {#each drillLinks as l (l.deck)}
          <a class="btn primary small" href={l.href}>Drill these ({l.deck})</a>
        {/each}
      </div>
    {:else}
      <p class="muted">Study a little and your trickiest kana will show up here.</p>
    {/if}
  </section>

  <section class="panel block">
    <h2>Most confused</h2>
    {#if mixups.length}
      <ul class="mixups">
        {#each mixups as m (m.shown + m.answered)}
          {@const script = scriptFor(m.deck ?? 'hiragana')}
          <li>
            <span class="glyph" lang="ja"
              >{glyph(kanaById(m.shown), script) || kanaById(m.shown).katakana}</span
            >
            <span class="vs">↔</span>
            <span class="glyph" lang="ja"
              >{glyph(kanaById(m.answered), script) || kanaById(m.answered).katakana}</span
            >
            <span class="muted small">{m.count}×</span>
          </li>
        {/each}
      </ul>
      <a class="btn small" href="#/drills">Practise confusable pairs</a>
    {:else}
      <p class="muted">Mix-ups from typed answers, listening and drills appear here.</p>
    {/if}
  </section>
</div>

{#if timed.length}
  <section class="panel block">
    <h2>Slowest to recognise</h2>
    <ul class="timed">
      {#each timed as t (t.deck + t.id)}
        <li>
          <span class="glyph" lang="ja">{label(t.deck, t.id)}</span>
          <span class="time">{((t.avgMs ?? 0) / 1000).toFixed(1)}s</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .tile {
    padding: 1rem 1.2rem;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0 0.6rem;
  }

  .tile strong {
    font-family: var(--font-heading);
    font-size: 2.2rem;
    line-height: 1.1;
    grid-column: 1 / -1;
    margin-top: 0.4rem;
  }

  .tile span {
    font-weight: 600;
    color: var(--ink-soft);
    grid-column: 1 / -1;
  }

  .tile small {
    grid-column: 1 / -1;
  }

  .block {
    padding: 1.2rem 1.4rem;
    margin-bottom: 1rem;
  }

  .block h2 {
    font-size: 1.15rem;
  }

  .two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 0 1rem;
  }

  .decks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .decks li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3rem;
    font-size: 0.9rem;
  }

  .decks li :global(.bar) {
    grid-column: 1 / -1;
  }

  .weak,
  .mixups,
  .timed {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
    display: grid;
    gap: 0.4rem;
  }

  .weak li {
    display: grid;
    grid-template-columns: 3.6rem 3rem 1fr auto;
    align-items: center;
    gap: 0.5rem;
  }

  .glyph {
    font-family: var(--font-kana);
    font-size: 1.6rem;
    line-height: 1.2;
  }

  .romaji {
    font-weight: 600;
  }

  .small {
    font-size: 0.8rem;
  }

  .acc {
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
    font-weight: 600;
  }

  .acc.low {
    color: var(--shu);
  }

  .mixups li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .vs {
    color: var(--ink-faint);
  }

  .timed {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }

  .timed li {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .time {
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
