<script lang="ts">
  import { washiStyle } from '../lib/ui/washi'
  import Hanko from '../components/Hanko.svelte'
  import Icon from '../components/Icon.svelte'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import MasteryBar from '../components/MasteryBar.svelte'
  import { STUDY_DECKS } from '../lib/storage/schema'
  import { goalProgress } from '../lib/study/goal'
  import { streak } from '../lib/study/stats'
  import { DECK_INFO, deckSummary } from '../lib/study/summary'
  import { store } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  let now = $state(Date.now())
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000)
    return () => clearInterval(timer)
  })

  const summaries = $derived(STUDY_DECKS.map((d) => deckSummary(store.data, d, now)))
  const s = $derived(streak(store.data.log, now))
  const goal = $derived(goalProgress(store.data, now))
  const firstVisit = $derived(store.data.log.length === 0)
  const mastered = $derived(summaries.reduce((n, d) => n + d.mastery.mature, 0))

  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'こんばんは' : hour < 11 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは'
  const greetingEn = $derived(
    hour < 5
      ? t('home.greeting.evening')
      : hour < 11
        ? t('home.greeting.morning')
        : hour < 18
          ? t('home.greeting.day')
          : t('home.greeting.evening'),
  )
</script>

<section class="hero">
  <p class="eyebrow light">{greetingEn}</p>
  <h1><span lang="ja">{greeting}</span></h1>
  {#if firstVisit}
    <p class="lead">
      {t('home.lead')}
    </p>
  {:else}
    <div class="badges">
      <span
        class="badge goal"
        class:reached={goal.reached}
        title={t('home.goal.title', { goal: String(goal.goal) })}
        aria-label={t('home.goal.label', { done: String(goal.done), goal: String(goal.goal) })}
      >
        <svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" />
          <circle
            cx="18"
            cy="18"
            r="15"
            class="fill"
            style:stroke-dasharray="{goal.fraction * 94.25} 94.25"
          />
        </svg>
        {t('home.goal.today', { done: String(goal.done), goal: String(goal.goal) })}
      </span>
      <span class="badge" title={t('home.streak.title')}
        ><Icon name="flame" size={16} /> {t('home.streak', { n: s.current })}</span
      >
      <span class="badge"><Hanko size={18} /> {t('home.mastered', { count: mastered })}</span>
    </div>
  {/if}
</section>

<section class="decks" aria-label={t('home.decks.ariaLabel')}>
  {#each summaries as d (d.deck)}
    {@const info = DECK_INFO[d.deck]}
    <article class="deck panel">
      <div class="deck-head">
        <div class="sample washi turn" style={washiStyle(d.deck)} aria-hidden="true">
          <KanaGlyph
            text={info.sample}
            font="klee-one"
            size={info.sample.length > 1 ? '2.4rem' : '3.2rem'}
          />
        </div>
        <div>
          <h2>{t(`deck.${d.deck}` as MessageKey)}</h2>
          <p class="jp" lang="ja">{info.jp}</p>
        </div>
      </div>
      <dl class="counts">
        <div>
          <dt>{t('home.deck.due')}</dt>
          <dd class:hot={d.due > 0}>{d.due}</dd>
        </div>
        <div>
          <dt>{t('home.deck.newToday')}</dt>
          <dd>{d.fresh}</dd>
        </div>
        <div>
          <dt>{t('home.deck.mastered')}</dt>
          <dd>{d.mastery.mature}<span class="muted">/{d.total}</span></dd>
        </div>
      </dl>
      <MasteryBar counts={d.mastery} total={d.total} />
      <div class="actions">
        <a class="btn primary" href="#/study/{d.deck}?mode=srs">
          {d.due + d.fresh > 0
            ? t('home.deck.study', { count: d.due + d.fresh })
            : t('home.deck.allDone')}
        </a>
        <a class="btn" href="#/study/{d.deck}?mode=order">{t('home.deck.inOrder')}</a>
      </div>
    </article>
  {/each}
</section>

<section class="more" aria-label={t('home.more.ariaLabel')}>
  <a class="tile panel" href="#/drills">
    <span class="tile-glyph" lang="ja">シ ツ</span>
    <span
      ><strong>{t('home.tile.confusable')}</strong><span class="muted"
        >{t('home.tile.confusableSub')}</span
      ></span
    >
  </a>
  <a class="tile panel" href="#/listen">
    <span class="tile-icon"><Icon name="ear" size={26} /></span>
    <span
      ><strong>{t('home.tile.listening')}</strong><span class="muted"
        >{t('home.tile.listeningSub')}</span
      ></span
    >
  </a>
  <a class="tile panel" href="#/reading">
    <span class="tile-glyph" lang="ja">ねこ</span>
    <span
      ><strong>{t('home.tile.reading')}</strong><span class="muted"
        >{t('home.tile.readingSub')}</span
      ></span
    >
  </a>
  <a class="tile panel" href="#/table">
    <span class="tile-icon"><Icon name="table" size={26} /></span>
    <span
      ><strong>{t('home.tile.table')}</strong><span class="muted">{t('home.tile.tableSub')}</span
      ></span
    >
  </a>
</section>

<style>
  .hero {
    color: #fff;
    text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
    padding: clamp(1rem, 6vh, 4rem) 0 clamp(1rem, 4vh, 2.5rem);
    max-width: 640px;
  }

  .hero h1 {
    font-size: clamp(2.6rem, 1.5rem + 5vw, 4.5rem);
    margin-bottom: 0.3em;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .lead {
    font-size: 1.1rem;
    max-width: 52ch;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgb(20 15 10 / 0.35);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-size: 0.88rem;
    font-weight: 560;
    text-shadow: none;
  }

  .ring {
    width: 20px;
    height: 20px;
    transform: rotate(-90deg);
  }

  .ring circle {
    fill: none;
    stroke: rgb(255 255 255 / 0.3);
    stroke-width: 5;
  }

  .ring .fill {
    stroke: #fff;
    stroke-linecap: round;
    transition: stroke-dasharray 0.6s var(--ease);
  }

  .goal.reached {
    background: color-mix(in srgb, var(--shu) 75%, transparent);
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
    gap: 1rem;
  }

  .deck-head {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .deck-head h2 {
    margin: 0;
    font-size: 1.35rem;
  }

  .jp {
    margin: 0;
    color: var(--ink-faint);
    font-size: 0.9rem;
  }

  .sample {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    box-shadow: var(--shadow-soft);
    transform: rotate(-2deg);
    flex: none;
  }

  .counts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    gap: 0.5rem;
  }

  .counts dt {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }

  .counts dd {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .counts dd.hot {
    color: var(--shu);
  }

  .counts .muted {
    font-size: 0.9rem;
    font-weight: 400;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions .primary {
    flex: 1;
  }

  .more {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.1rem;
    color: var(--ink);
    text-decoration: none;
    transition:
      transform 0.2s var(--ease),
      box-shadow 0.2s;
  }

  .tile:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  .tile > span:last-child {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .tile .muted {
    font-size: 0.85rem;
  }

  .tile-glyph,
  .tile-icon {
    width: 56px;
    height: 56px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink) 6%, transparent);
    font-family: var(--font-kana);
    font-size: 1.3rem;
    white-space: nowrap;
  }
</style>
