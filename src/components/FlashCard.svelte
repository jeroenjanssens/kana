<script lang="ts">
  import { confusableSets } from '../lib/data/confusables'
  import { mnemonicFor } from '../lib/data/mnemonics'
  import Hint from './Hint.svelte'
  import { displayRomaji, glyph, type Kana } from '../lib/data/kana'
  import { FONT_STYLES, fontById } from '../lib/data/fonts'
  import type { DeckId } from '../lib/storage/schema'
  import { settings } from '../state/app.svelte'
  import FontGallery from './FontGallery.svelte'
  import Hanko from './Hanko.svelte'
  import Icon from './Icon.svelte'
  import KanaGlyph from './KanaGlyph.svelte'
  import PaperCard from './PaperCard.svelte'

  let {
    kana,
    deck,
    font,
    flipped,
    tilt = 0,
    paper = 0,
    isNew = false,
    tricky = false,
    celebrate = false,
    verdict,
    onflip,
    onplay,
    onstrokes,
    onfonts,
  }: {
    kana: Kana
    deck: DeckId
    font: string
    flipped: boolean
    tilt?: number
    paper?: number
    isNew?: boolean
    /** The card is a leech: offer extra help. */
    tricky?: boolean
    celebrate?: boolean
    /** Result of a typed answer, shown on the back. */
    verdict?: { correct: boolean; typed: string }
    onflip: () => void
    onplay: () => void
    onstrokes: () => void
    onfonts: () => void
  } = $props()

  const s = $derived(settings())
  const frontText = $derived(
    deck === 'combined'
      ? `${kana.hiragana}${kana.katakana}`
      : glyph(kana, deck === 'katakana' ? 'katakana' : 'hiragana'),
  )
  const otherScript = $derived(
    deck === 'hiragana' ? kana.katakana : deck === 'katakana' ? kana.hiragana : '',
  )
  const fontInfo = $derived(fontById(font))
  const hintScripts = $derived(
    deck === 'combined'
      ? (['hiragana', 'katakana'] as const)
      : ([deck === 'katakana' ? 'katakana' : 'hiragana'] as const),
  )
  /** A confusable-pairs drill containing this kana, offered for tricky cards. */
  const drill = $derived(
    confusableSets.find(
      (set) => set.chars.includes(kana.hiragana) || set.chars.includes(kana.katakana),
    ),
  )
  const frontSize = $derived(
    deck === 'combined'
      ? kana.hiragana.length > 1
        ? '4.6rem'
        : '7rem'
      : frontText.length > 1
        ? '7rem'
        : '10.5rem',
  )
  const galleryFonts = $derived(s.fontMode === 'random' ? s.randomFonts : [s.font])
  const scriptLabel = $derived(
    deck === 'combined' ? 'Hiragana and katakana' : deck === 'katakana' ? 'Katakana' : 'Hiragana',
  )
</script>

<PaperCard
  {flipped}
  {tilt}
  {paper}
  label="{scriptLabel} card{flipped ? `, ${kana.romaji}` : ', tap to reveal'}"
  {onflip}
>
  {#snippet front()}
    {#if isNew}<span class="chip new">New</span>{/if}
    <div class="front-glyph" class:pair={deck === 'combined'}>
      {#if deck === 'combined'}
        <KanaGlyph text={kana.hiragana} {font} size={frontSize} />
        <span class="divider" aria-hidden="true"></span>
        <KanaGlyph text={kana.katakana} {font} size={frontSize} />
      {:else}
        <KanaGlyph text={frontText} {font} size={frontSize} />
      {/if}
    </div>
    <span class="hint muted">Tap or press <kbd>Space</kbd></span>
  {/snippet}
  {#snippet back()}
    <div class="back-top">
      <KanaGlyph text={frontText} {font} size="2.6rem" />
      {#if s.showOtherScript && otherScript}
        <span class="other" title="The same sound in the other script">
          <KanaGlyph text={otherScript} {font} size="1.6rem" ink={false} />
        </span>
      {/if}
    </div>
    {#if verdict}
      <p class="verdict" class:wrong={!verdict.correct}>
        {#if verdict.correct}
          <Icon name="check" size={16} /> Correct
        {:else}
          You typed <strong>{verdict.typed || '—'}</strong>
        {/if}
      </p>
    {/if}
    {#if tricky}
      <p class="tricky">
        <span class="chip">Tricky</span>
        {#if drill}
          <a href="#/drills/{drill.id}" onclick={(e) => e.stopPropagation()}
            >Compare {drill.title}</a
          >
        {/if}
      </p>
    {/if}
    <p class="romaji" class:inked={flipped}>{displayRomaji(kana, s.romaji)}</p>
    <p class="mnemonic">
      {#each hintScripts as script (script)}<span><Hint text={mnemonicFor(kana, script)} /></span
        >{/each}
    </p>
    <div class="tools">
      <button
        class="btn small"
        onclick={(e) => {
          e.stopPropagation()
          onplay()
        }}
        aria-label="Play pronunciation (P)"><Icon name="play" size={14} filled /> Listen</button
      >
      <button
        class="btn small"
        onclick={(e) => {
          e.stopPropagation()
          onstrokes()
        }}
        aria-label="Stroke order (S)"><Icon name="brush" size={14} /> Strokes</button
      >
      <button
        class="btn small"
        onclick={(e) => {
          e.stopPropagation()
          onfonts()
        }}
        aria-label="Font gallery (F)"><Icon name="fonts" size={14} /> Fonts</button
      >
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="strip" onclick={(e) => e.stopPropagation()}>
      <FontGallery
        text={frontText}
        fonts={galleryFonts.length > 1 ? galleryFonts : undefined}
        compact
        current={font}
      />
    </div>
    <p class="font-name">
      {fontInfo ? `${fontInfo.name} · ${FONT_STYLES[fontInfo.style]}` : 'System font'}
    </p>
    {#if celebrate}
      <div class="seal"><Hanko size={92} stamp title="Mastered!" /></div>
    {/if}
  {/snippet}
</PaperCard>

<style>
  .front-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    flex: 1;
  }

  .divider {
    width: 1px;
    height: 40%;
    background: var(--line);
  }

  .hint {
    font-size: 0.78rem;
  }

  .chip.new {
    position: absolute;
    top: 1rem;
    left: 1rem;
    color: var(--shu);
    border-color: var(--shu-soft);
    background: color-mix(in srgb, var(--paper) 80%, transparent);
  }

  .back-top {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .other {
    opacity: 0.55;
  }

  .romaji {
    font-family: var(--font-heading);
    font-size: clamp(3rem, 12vw, 4.4rem);
    line-height: 1;
    margin: 0.4rem 0 0.8rem;
    letter-spacing: 0.02em;
  }

  /* The answer appears like ink soaking into the paper. */
  .romaji.inked {
    animation: ink-spread 0.9s var(--ease) 0.25s both;
  }

  @keyframes ink-spread {
    from {
      opacity: 0;
      filter: blur(6px);
      letter-spacing: 0.12em;
    }
    to {
      opacity: 1;
      filter: blur(0);
      letter-spacing: 0.02em;
    }
  }

  .mnemonic {
    margin: -0.3rem 0 0.7rem;
    max-width: 34ch;
    font-size: 0.78rem;
    line-height: 1.35;
    color: var(--ink-soft);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .tricky {
    margin: 0.4rem 0 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.8rem;
  }

  .tricky .chip {
    color: var(--shu);
    border-color: var(--shu-soft);
  }

  .verdict {
    margin: 0.4rem 0 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
    color: var(--matcha);
  }

  .verdict.wrong {
    color: var(--shu);
    font-weight: 500;
  }

  .tools {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .strip {
    width: 100%;
    margin-top: 1rem;
    cursor: default;
  }

  .font-name {
    margin: 0.5rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-faint);
    letter-spacing: 0.04em;
  }

  .seal {
    position: absolute;
    right: 1.2rem;
    top: 1.2rem;
  }
</style>
