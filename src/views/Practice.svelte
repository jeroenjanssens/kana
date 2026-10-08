<script lang="ts">
  import Icon from '../components/Icon.svelte'
  import { confusableSets } from '../lib/data/confusables'
  import { deckSummary } from '../lib/study/summary'
  import { unlockedWords } from '../lib/study/reading'
  import { store } from '../state/app.svelte'

  const listenDue = $derived(
    (['listen-hiragana', 'listen-katakana'] as const)
      .map((d) => deckSummary(store.data, d))
      .reduce((n, s) => n + s.due + s.fresh, 0),
  )
  const words = $derived(unlockedWords(store.data).length)
</script>

<header class="page-head">
  <p class="eyebrow light">練習 · Practice</p>
  <h1>Practice</h1>
  <p class="lead">Beyond flashcards: train your eyes, ears and reading.</p>
</header>

<div class="grid">
  <a class="card panel" href="#/drills">
    <span class="art" lang="ja">シツ</span>
    <h2>Confusable pairs</h2>
    <p>
      Compare look-alikes such as シ/ツ and ぬ/め, then quiz yourself. {confusableSets.length} sets.
    </p>
  </a>
  <a class="card panel" href="#/listen">
    <span class="art"><Icon name="ear" size={40} /></span>
    <h2>Listening</h2>
    <p>
      Hear a sound and pick the kana. {listenDue
        ? `${listenDue} ready today.`
        : 'All done for today.'}
    </p>
  </a>
  <a class="card panel" href="#/write">
    <span class="art"><Icon name="brush" size={40} /></span>
    <h2>Writing</h2>
    <p>See the romaji, write the kana — stroke order and direction are checked.</p>
  </a>
  <a class="card panel" href="#/reading">
    <span class="art" lang="ja">ねこ</span>
    <h2>Reading practice</h2>
    <p>
      Real words made of kana you know.
      {words ? `${words} words unlocked.` : 'Learn a couple of rows to unlock your first words.'}
    </p>
  </a>
  <a class="card panel" href="#/study/hiragana?mode=order">
    <span class="art" lang="ja">あ→ん</span>
    <h2>Study in order</h2>
    <p>Go through rows one by one, without affecting your schedule.</p>
  </a>
</div>

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
    margin-bottom: 1rem;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

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
</style>
