<script lang="ts">
  import Icon from '../components/Icon.svelte'
  import { confusableSets } from '../lib/data/confusables'
  import { deckSummary } from '../lib/study/summary'
  import { unlockedWords } from '../lib/study/reading'
  import { store } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'

  const listenDue = $derived(
    (['listen-hiragana', 'listen-katakana'] as const)
      .map((d) => deckSummary(store.data, d))
      .reduce((n, s) => n + s.due + s.fresh, 0),
  )
  const words = $derived(unlockedWords(store.data).length)
</script>

<header class="page-head">
  <p class="eyebrow light">{t('practice.eyebrow')}</p>
  <h1>{t('practice.heading')}</h1>
  <p class="lead">{t('practice.lead')}</p>
</header>

<div class="grid">
  <a class="card panel" href="#/drills">
    <span class="art" lang="ja">シツ</span>
    <h2>{t('practice.drillsHeading')}</h2>
    <p>
      {t('practice.drillsDesc', { count: confusableSets.length })}
    </p>
  </a>
  <a class="card panel" href="#/listen">
    <span class="art"><Icon name="ear" size={40} /></span>
    <h2>{t('practice.listenHeading')}</h2>
    <p>
      {t('practice.listenDesc')}
      {listenDue ? t('practice.listenDue', { count: listenDue }) : t('practice.allDoneToday')}
    </p>
  </a>
  <a class="card panel" href="#/write">
    <span class="art"><Icon name="brush" size={40} /></span>
    <h2>{t('practice.writeHeading')}</h2>
    <p>{t('practice.writeDesc')}</p>
  </a>
  <a class="card panel" href="#/trace">
    <span class="art" lang="ja">なぞる</span>
    <h2>{t('practice.traceHeading')}</h2>
    <p>{t('practice.traceDesc')}</p>
  </a>
  <a class="card panel" href="#/worksheet">
    <span class="art fading" lang="ja"><span>あ</span><span>あ</span><span>あ</span></span>
    <h2>{t('practice.worksheetHeading')}</h2>
    <p>{t('practice.worksheetDesc')}</p>
  </a>
  <a class="card panel" href="#/sprint">
    <span class="art"><Icon name="stopwatch" size={40} /></span>
    <h2>{t('practice.sprintHeading')}</h2>
    <p>{t('practice.sprintDesc')}</p>
  </a>
  <a class="card panel" href="#/race">
    <span class="art"><Icon name="flag" size={40} /></span>
    <h2>{t('practice.raceHeading')}</h2>
    <p>{t('practice.raceDesc')}</p>
  </a>
  <a class="card panel" href="#/reading">
    <span class="art" lang="ja">ねこ</span>
    <h2>{t('practice.readingHeading')}</h2>
    <p>
      {t('practice.readingDesc')}
      {words ? t('practice.readingUnlocked', { count: words }) : t('practice.readingHint')}
    </p>
  </a>
  <a class="card panel" href="#/study/hiragana?mode=order">
    <span class="art" lang="ja">あ→ん</span>
    <h2>{t('practice.studyInOrderHeading')}</h2>
    <p>{t('practice.studyInOrderDesc')}</p>
  </a>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .card {
    padding: 1.4rem;
    color: var(--ink);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition:
      transform 0.2s var(--ease),
      box-shadow 0.2s;
  }

  .card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow);
  }

  .card h2 {
    margin: 0.4rem 0 0;
    font-size: 1.3rem;
  }

  .card p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.92rem;
  }

  .art {
    width: 76px;
    height: 76px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    font-family: var(--font-kana);
    font-size: 1.6rem;
    white-space: nowrap;
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }

  /* A tiny worksheet: the kana, then fainter and fainter traces. */
  .fading {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.4rem;
    line-height: normal;
  }

  .fading span:nth-child(2) {
    opacity: 0.45;
  }

  .fading span:nth-child(3) {
    opacity: 0.18;
  }
</style>
