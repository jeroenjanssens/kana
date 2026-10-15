<script lang="ts">
  import { tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import { FONTS } from '../lib/data/fonts'
  import { displayRomaji, type Kana } from '../lib/data/kana'
  import { audio, settings } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'
  import FontGallery from './FontGallery.svelte'
  import KanaDetails from './KanaDetails.svelte'
  import KanaGlyph from './KanaGlyph.svelte'
  import Modal from './Modal.svelte'
  import StrokeOrder from './StrokeOrder.svelte'

  /** The kana missed in a session, in order. Click one to see its full card. */
  let {
    missed,
    width = '520px',
  }: {
    /** `text` is how the kana was shown; `typed` what was typed instead, if anything. */
    missed: { kana: Kana; text: string; typed?: string }[]
    width?: string
  } = $props()

  let selected = $state<Kana | undefined>()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)
  let fullEl = $state<HTMLDivElement>()
  const anyTyped = $derived(missed.some((m) => m.typed !== undefined))

  function select(k: Kana) {
    if (selected?.id === k.id) {
      selected = undefined
      return
    }
    selected = k
    void audio.playVoice(k.id)
    void tick().then(() => fullEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  /**
   * Let the review handle a key first. Returns true when it did: Escape closes the open card,
   * and while a dialog is open every key belongs to it.
   */
  export function handleKey(e: KeyboardEvent): boolean {
    if (strokesOpen || fontsOpen) return true
    if (e.key === 'Escape' && selected) {
      selected = undefined
      return true
    }
    return false
  }
</script>

{#if missed.length}
  <div class="review" style:--w={width}>
    <section class="panel list" in:fly={{ y: 12, delay: 80 }}>
      <h3>{t('missed.heading')}</h3>
      <p class="muted hint">{t('missed.hint')}</p>
      <ul class:compact={!anyTyped}>
        {#each missed as m, i (i)}
          <li>
            <button
              class="miss"
              class:active={selected?.id === m.kana.id}
              aria-pressed={selected?.id === m.kana.id}
              aria-label={t('missed.showCard', {
                kana: m.text,
                romaji: displayRomaji(m.kana, settings().romaji),
              })}
              onclick={() => select(m.kana)}
            >
              <KanaGlyph
                text={m.text}
                font={settings().font}
                size={m.text.length > 1 ? '1.7rem' : '2.4rem'}
              />
            </button>
            <span class="answers">
              {#if m.typed !== undefined}
                <span
                  ><span class="label muted">{t('missed.typed')}</span>
                  <span class="wrong">{m.typed || '—'}</span></span
                >
                <span
                  ><span class="label muted">{t('missed.expected')}</span>
                  <strong>{displayRomaji(m.kana, settings().romaji)}</strong></span
                >
              {:else}
                <strong>{displayRomaji(m.kana, settings().romaji)}</strong>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </section>
    {#if selected}
      <div class="full" bind:this={fullEl}>
        <KanaDetails
          kana={selected}
          onstrokes={() => (strokesOpen = true)}
          onfonts={() => (fontsOpen = true)}
          onclose={() => (selected = undefined)}
        />
      </div>
    {/if}
  </div>
{/if}

{#if selected}
  <Modal bind:open={strokesOpen} title={t('table.strokeOrder')}>
    <div class="strokes">
      {#if selected.hiragana}<StrokeOrder text={selected.hiragana} size={180} />{/if}
      <StrokeOrder text={selected.katakana} size={180} />
    </div>
  </Modal>
  <Modal bind:open={fontsOpen} title={t('table.fontGallery')} wide>
    <FontGallery
      text={selected.hiragana || selected.katakana}
      fonts={FONTS.map((f) => f.id)}
      current={settings().font}
    />
    {#if selected.hiragana}
      <div style="height: 1rem"></div>
      <FontGallery
        text={selected.katakana}
        fonts={FONTS.map((f) => f.id)}
        current={settings().font}
      />
    {/if}
  </Modal>
{/if}

<style>
  .review {
    width: min(100%, var(--w));
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .list {
    padding: 1.5rem;
  }

  h3 {
    margin: 0;
  }

  .hint {
    font-size: 0.9rem;
    margin: 0.2rem 0 0.8rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  ul.compact {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .miss {
    width: 3.6rem;
    height: 3.6rem;
    flex: none;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .miss:hover,
  .miss.active {
    border-color: var(--shu);
    background: color-mix(in srgb, var(--shu) 10%, transparent);
  }

  .answers {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .label {
    font-size: 0.75rem;
  }

  .wrong {
    font-weight: 650;
    color: var(--shu);
  }

  .strokes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
</style>
