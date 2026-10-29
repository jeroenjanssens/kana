<script lang="ts">
  import { tick } from 'svelte'
  import { FONTS } from '../lib/data/fonts'
  import { segment, type Kana } from '../lib/data/kana'
  import type { Word } from '../lib/data/words'
  import { formatInterval, masteryLevel } from '../lib/srs/queue'
  import type { MessageKey } from '../lib/i18n/messages'
  import { glyphsText, wordMeaning, type WordKana } from '../lib/study/reading'
  import { audio, settings, store } from '../state/app.svelte'
  import { lang, t } from '../state/i18n.svelte'
  import FontGallery from './FontGallery.svelte'
  import KanaDetails from './KanaDetails.svelte'
  import Modal from './Modal.svelte'
  import RuleList from './RuleList.svelte'
  import StrokeOrder from './StrokeOrder.svelte'
  import VoiceButtons from './VoiceButtons.svelte'
  import WordText from './WordText.svelte'

  /** Everything about a practice word: its sound, rules, kana and your progress. */
  let { word, missing = [] }: { word: Word; missing?: readonly WordKana[] } = $props()

  /** The kana of the word; `gap` where a new word of a phrase starts. */
  const parts = $derived(
    word.parts.flatMap((part, w) => segment(part).map((p, i) => ({ ...p, gap: w > 0 && i === 0 }))),
  )
  const progress = $derived(store.data.words[word.kana])
  const spaces = $derived(settings().readingSpaces)
  const level = $derived(masteryLevel(progress?.card))
  const now = Date.now()
  let selected = $state<Kana | undefined>()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)
  let detailsEl = $state<HTMLDivElement>()

  function select(k: Kana) {
    selected = selected?.id === k.id ? undefined : k
    if (!selected) return
    void audio.playVoice(k.id)
    void tick().then(() => detailsEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }
</script>

<article class="word-card" aria-label={word.kana}>
  <div class="head">
    <WordText {word} font={settings().font} max="3.4rem" phraseMax="2.6rem" {spaces} />
    <p class="romaji">{word.romaji}</p>
    <p class="meaning">{wordMeaning(word, lang())}</p>
    <VoiceButtons label={word.kana} play={(voice) => void audio.playWord(word.index, voice)} />
  </div>

  {#if missing.length}
    <p class="missing">
      {t('word.needs')}
      <span lang="ja">
        {glyphsText(missing)}
      </span>
    </p>
  {/if}

  {#if word.rules.length}
    <section>
      <h3>{t('rules.forKana')}</h3>
      <RuleList rules={word.rules} />
    </section>
  {/if}

  <section>
    <h3>{t('word.parts')}</h3>
    <div class="parts">
      {#each parts as p, i (i)}
        {#if p.kana}
          {@const k = p.kana}
          <button
            class="part"
            class:gap={p.gap && spaces}
            class:active={selected?.id === k.id}
            aria-pressed={selected?.id === k.id}
            onclick={() => select(k)}
          >
            <span lang="ja">{p.text}</span>
            <small>{k.romaji}</small>
          </button>
        {:else}
          <span class="part mark" class:gap={p.gap && spaces}
            ><span lang="ja">{p.text}</span><small
              >{p.text === 'ー'
                ? t('word.long')
                : p.text === 'っ' || p.text === 'ッ'
                  ? t('word.pause')
                  : ''}</small
            ></span
          >
        {/if}
      {/each}
    </div>
    {#if selected}
      <div class="details" bind:this={detailsEl}>
        <KanaDetails
          kana={selected}
          onstrokes={() => (strokesOpen = true)}
          onfonts={() => (fontsOpen = true)}
          onclose={() => (selected = undefined)}
        />
      </div>
    {/if}
  </section>

  <p class="progress muted">
    {progress?.seen
      ? t('word.progress', { seen: progress.seen, correct: progress.correct })
      : t('word.notPractised')}
    {#if progress?.card && level !== 'new'}
      {t(`study.mastery.${level}` as MessageKey)} ·
      {progress.card.due <= now
        ? t('wordList.due')
        : t('wordList.dueIn', { time: formatInterval(progress.card.due - now, lang()) })}
    {/if}
  </p>
</article>

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
  </Modal>
{/if}

<style>
  .word-card {
    display: grid;
    gap: 1rem;
  }

  /* A size container, so the word can be sized to fit it (see wordSize). */
  .head {
    container-type: inline-size;
    display: grid;
    justify-items: center;
    gap: 0.3rem;
    text-align: center;
  }

  .romaji {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 650;
  }

  .meaning {
    margin: 0 0 0.3rem;
    color: var(--ink-soft);
  }

  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .parts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .part {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    min-width: 3rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in srgb, var(--paper) 60%, transparent);
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  .part span {
    font-family: var(--font-kana);
    font-size: 1.4rem;
  }

  .part small {
    font-size: 0.7rem;
    color: var(--ink-faint);
  }

  .part.active {
    background: var(--ink);
    color: var(--paper);
  }

  .part.mark {
    cursor: default;
    opacity: 0.7;
  }

  .part.gap {
    margin-left: 0.6rem;
  }

  .details {
    margin-top: 0.8rem;
  }

  .missing {
    margin: 0;
    text-align: center;
  }

  .missing span {
    font-family: var(--font-kana);
    font-size: 1.2rem;
  }

  .progress {
    margin: 0;
    font-size: 0.85rem;
  }

  .strokes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
</style>
