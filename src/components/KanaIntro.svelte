<script lang="ts">
  import { hasDrawing, showDrawing, toggleDrawing } from '../lib/data/drawings'
  import { displayRomaji, type Kana } from '../lib/data/kana'
  import { kanaNote, mnemonicFor, type KanaNote } from '../lib/data/mnemonics'
  import type { StudyDeckId } from '../lib/storage/schema'
  import { washiStyle } from '../lib/ui/washi'
  import { settings } from '../state/app.svelte'
  import { t, lang } from '../state/i18n.svelte'
  import Hint from './Hint.svelte'
  import Icon from './Icon.svelte'
  import DrawingToggle from './DrawingToggle.svelte'
  import KanaDrawing from './KanaDrawing.svelte'
  import KanaGlyph from './KanaGlyph.svelte'
  import StrokeOrder from './StrokeOrder.svelte'

  /** The first meeting with a new kana: sound, strokes and a memory hint. */
  let {
    kana,
    deck,
    font,
    notes = [],
    onplay,
    ondone,
  }: {
    kana: Kana
    deck: StudyDeckId
    font: string
    /** Rule notes (dakuten, yōon…) to show because they're new to the learner. */
    notes?: KanaNote[]
    onplay: () => void
    ondone: () => void
  } = $props()

  const scripts = $derived(
    deck === 'combined'
      ? (['hiragana', 'katakana'] as const)
      : ([deck === 'katakana' ? 'katakana' : 'hiragana'] as const),
  )
  const text = (script: 'hiragana' | 'katakana') =>
    script === 'hiragana' ? kana.hiragana : kana.katakana
  /** Big enough to study the shape (and the drawing), and still side by side on phones. */
  const glyphSize = $derived(
    kana.hiragana.length > 1
      ? scripts.length > 1
        ? 'min(8.8rem, 20vw)'
        : 'min(8.8rem, 36vw)'
      : scripts.length > 1
        ? 'min(12rem, 36vw)'
        : 'min(12rem, 64vw)',
  )
  const drawable = $derived(scripts.some((script) => hasDrawing(kana, script)))
  const drawn = $derived(drawable && showDrawing(settings().drawings, 'back'))
</script>

<article
  class="intro washi turn"
  style={washiStyle(`intro:${kana.id}`)}
  aria-label={t('study.kanaIntro.ariaLabel', { romaji: kana.romaji })}
>
  <p class="eyebrow">{t('study.kanaIntro.eyebrow')}</p>
  <div class="glyphs">
    {#each scripts as script (script)}
      {#if drawn && hasDrawing(kana, script)}
        <KanaDrawing id={kana.id} {script} text={text(script)} size={glyphSize} />
      {:else}
        <KanaGlyph text={text(script)} {font} size={glyphSize} />
      {/if}
    {/each}
  </div>
  <p class="romaji">{displayRomaji(kana, settings().romaji)}</p>
  <div class="actions">
    <button class="btn small" onclick={onplay} aria-label={t('study.kanaIntro.playLabel')}>
      <Icon name="play" size={14} filled />
      {t('common.listen')}
    </button>
    {#if drawable}
      <DrawingToggle
        on={drawn}
        ontoggle={() => (settings().drawings = toggleDrawing(settings().drawings, 'back'))}
      />
    {/if}
  </div>
  <div class="strokes">
    {#each scripts as script (script)}
      <StrokeOrder text={text(script)} size={120} />
    {/each}
  </div>
  <ul class="hints">
    {#each scripts as script (script)}
      <li>
        {#if scripts.length > 1}<span class="script"
            >{t(script === 'hiragana' ? 'common.hiragana' : 'common.katakana')}</span
          >{/if}
        <Hint text={mnemonicFor(kana, script, lang())} />
      </li>
    {/each}
  </ul>
  {#each notes as n (n)}
    {@const note = kanaNote(n, lang())}
    <aside class="note">
      <strong>{note.title}</strong>
      <span>{note.body}</span>
      <span class="example" lang="ja">{note.example}</span>
    </aside>
  {/each}
  <button class="btn primary got" onclick={ondone}
    >{t('study.kanaIntro.gotIt')} <kbd>Space</kbd></button
  >
  <p class="muted small">{t('study.kanaIntro.comesBack')}</p>
</article>

<style>
  .intro {
    position: relative;
    width: min(92vw, 520px);
    padding: 1.4rem 1.5rem 1.2rem;
    border-radius: 18px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--shu);
  }

  .glyphs {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .actions {
    display: flex;
    gap: 0.4rem;
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: 2.4rem;
    line-height: 1;
    margin: 0;
  }

  .strokes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }

  .hints {
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
    max-width: 46ch;
    line-height: 1.45;
    text-wrap: pretty;
  }

  .script {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }

  .note {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.6rem 0.9rem;
    border-left: 3px solid var(--shu);
    background: color-mix(in srgb, var(--paper) 70%, transparent);
    border-radius: 6px;
    font-size: 0.88rem;
    text-align: left;
    max-width: 44ch;
  }

  .example {
    color: var(--ink-soft);
  }

  .got {
    margin-top: 0.4rem;
    min-width: 200px;
  }

  .small {
    font-size: 0.78rem;
    margin: 0;
  }
</style>
