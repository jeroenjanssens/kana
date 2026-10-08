<script lang="ts">
  import { displayRomaji, type Kana } from '../lib/data/kana'
  import {
    formatInterval,
    masteryLevel,
    retrievability,
    type MasteryLevel,
  } from '../lib/srs/scheduler'
  import type { DeckId } from '../lib/storage/schema'
  import { audio, settings, store } from '../state/app.svelte'
  import Hanko from './Hanko.svelte'
  import Icon from './Icon.svelte'
  import KanaGlyph from './KanaGlyph.svelte'

  let {
    kana,
    onstrokes,
    onfonts,
    onclose,
  }: { kana: Kana; onstrokes: () => void; onfonts: () => void; onclose?: () => void } = $props()

  const LEVEL_LABEL: Record<MasteryLevel, string> = {
    new: 'Not studied',
    learning: 'Learning',
    young: 'Young',
    mature: 'Mastered',
  }

  const decks = $derived(
    (
      [
        ['hiragana', 'Hiragana'],
        ['katakana', 'Katakana'],
        ['combined', 'Combined'],
        ['listen-hiragana', 'Listening (hiragana)'],
        ['listen-katakana', 'Listening (katakana)'],
      ] as [DeckId, string][]
    )
      .filter(([d]) => kana.hiragana || d === 'katakana')
      .map(([deck, label]) => {
        const card = store.data.cards[deck]?.[kana.id]
        const level = masteryLevel(card)
        const r = retrievability(card)
        return { deck, label, card, level, r }
      }),
  )
</script>

<article class="details panel" aria-live="polite">
  {#if onclose}
    <button class="btn icon ghost close" onclick={onclose} aria-label="Close details">
      <Icon name="close" size={18} />
    </button>
  {/if}
  <div class="top">
    <div class="glyphs washi">
      {#if kana.hiragana}<KanaGlyph
          text={kana.hiragana}
          font={settings().font}
          size="3.4rem"
        />{/if}
      <KanaGlyph text={kana.katakana} font={settings().font} size="3.4rem" />
    </div>
    <p class="romaji">{displayRomaji(kana, settings().romaji)}</p>
  </div>
  <div class="actions">
    <button class="btn small" onclick={() => audio.playVoice(kana.id)}>
      <Icon name="play" size={14} filled /> Listen
    </button>
    <button class="btn small" onclick={onstrokes}><Icon name="brush" size={14} /> Strokes</button>
    <button class="btn small" onclick={onfonts}><Icon name="fonts" size={14} /> Fonts</button>
  </div>
  <ul class="decks">
    {#each decks as d (d.deck)}
      <li>
        <span class="dot level-{d.level}" aria-hidden="true"></span>
        <span class="label">{d.label}</span>
        <span class="level">
          {#if d.level === 'mature'}<Hanko size={16} />{/if}
          {LEVEL_LABEL[d.level]}
        </span>
        {#if d.card && d.card.state !== 0}
          <span class="meta muted">
            {d.card.reps} reviews · {d.card.lapses} lapses ·
            {d.card.due > Date.now()
              ? `due in ${formatInterval(d.card.due - Date.now())}`
              : 'due now'}
            {#if d.r !== undefined}· {Math.round(d.r * 100)}% recall{/if}
          </span>
        {/if}
      </li>
    {/each}
  </ul>
</article>

<style>
  .details {
    position: relative;
    padding: 1.1rem 1.25rem;
  }

  .close {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
    padding-right: 2rem;
  }

  .glyphs {
    display: flex;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    box-shadow: var(--shadow-soft);
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 2.2rem;
    margin: 0 0 0.3rem;
    line-height: 1;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.75rem;
  }

  .small {
    font-size: 0.82rem;
    margin: 0.75rem 0 0;
  }

  .decks {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }

  .decks li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0 0.6rem;
    font-size: 0.9rem;
  }

  .meta {
    grid-column: 2 / -1;
    font-size: 0.75rem;
  }

  @media (max-width: 720px) {
    .details {
      padding: 0.8rem 1rem;
    }

    .glyphs :global(.glyph) {
      font-size: 2.4rem !important;
    }

    .romaji {
      font-size: 1.7rem;
    }

    .decks {
      gap: 0.15rem;
      margin-top: 0.6rem;
    }

    .decks li {
      font-size: 0.78rem;
    }

    .meta {
      display: none;
    }
  }

  .level {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    font-weight: 600;
    font-size: 0.82rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--level-new);
  }

  .dot.level-learning {
    background: var(--level-learning);
  }

  .dot.level-young {
    background: var(--level-young);
  }

  .dot.level-mature {
    background: var(--level-mature);
  }
</style>
