<script lang="ts">
  import FontGallery from '../components/FontGallery.svelte'
  import KanaDetails from '../components/KanaDetails.svelte'
  import KanaTable from '../components/KanaTable.svelte'
  import Modal from '../components/Modal.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import { FONTS } from '../lib/data/fonts'
  import type { Kana, KanaGroup } from '../lib/data/kana'
  import type { MessageKey } from '../lib/i18n/messages'
  import { audio, settings, store } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'

  const s = $derived(settings())
  const GROUPS: { group: KanaGroup; jp: string; key: MessageKey }[] = [
    { group: 'basic', jp: '清音', key: 'table.groupBasic' },
    { group: 'dakuten', jp: '濁音・半濁音', key: 'table.groupDakuten' },
    { group: 'yoon', jp: '拗音', key: 'table.groupYoon' },
    { group: 'extended', jp: '外来音', key: 'table.groupExtended' },
  ]
  let openGroups = $state<KanaGroup[]>(['basic', 'dakuten', 'yoon'])
  let selected = $state<Kana | undefined>()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)

  function select(k: Kana) {
    selected = k
    void audio.playVoice(k.id)
  }

  function toggleGroup(g: KanaGroup) {
    openGroups = openGroups.includes(g) ? openGroups.filter((x) => x !== g) : [...openGroups, g]
  }

  const SCRIPT_TITLE_KEY: Record<string, MessageKey> = {
    combined: 'table.hiraganaKatakana',
    hiragana: 'common.hiragana',
    katakana: 'common.katakana',
  }
  const SCRIPT_JP: Record<string, string> = {
    combined: 'ひらがな・カタカナ',
    hiragana: 'ひらがな',
    katakana: 'カタカナ',
  }

  const tables = $derived(
    s.tableLayout === 'combined'
      ? [{ script: 'combined' as const }]
      : [{ script: 'hiragana' as const }, { script: 'katakana' as const }],
  )

  function cardsFor(script: 'hiragana' | 'katakana' | 'combined') {
    if (!s.tableMastery) return undefined
    const deck = script === 'combined' ? s.tableMasteryDeck : script
    return store.data.cards[deck] ?? {}
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow light">{t('table.eyebrow')}</p>
    <h1>{t('table.heading')}</h1>
  </div>
  <div class="controls panel">
    <div class="segmented" role="group" aria-label={t('table.layout')}>
      <button
        aria-pressed={s.tableLayout === 'separate'}
        onclick={() => (s.tableLayout = 'separate')}>{t('table.separate')}</button
      >
      <button
        aria-pressed={s.tableLayout === 'combined'}
        onclick={() => (s.tableLayout = 'combined')}>{t('table.combined')}</button
      >
    </div>
    <label class="switch"
      ><span>{t('table.romajiToggle')}</span><input
        type="checkbox"
        bind:checked={s.tableRomaji}
      /></label
    >
    <label class="switch"
      ><span>{t('table.masteryToggle')}</span><input
        type="checkbox"
        bind:checked={s.tableMastery}
      /></label
    >
    {#if s.tableLayout === 'combined' && s.tableMastery}
      <label class="select">
        <span class="visually-hidden">{t('table.colourByDeck')}</span>
        <select bind:value={s.tableMasteryDeck} aria-label={t('table.colourMasteryByDeck')}>
          <option value="combined">{t('table.deckCombined')}</option>
          <option value="hiragana">{t('table.deckHiragana')}</option>
          <option value="katakana">{t('table.deckKatakana')}</option>
        </select>
      </label>
    {/if}
  </div>
</header>

<div class="layout">
  <div class="tables">
    {#each GROUPS as g (g.group)}
      {@const show =
        g.group !== 'extended' || s.groups.includes('extended') || openGroups.includes('extended')}
      {#if show}
        <section class="group panel">
          <button
            class="group-head"
            aria-expanded={openGroups.includes(g.group)}
            onclick={() => toggleGroup(g.group)}
          >
            <h2>{t(g.key)} <span class="jp" lang="ja">{g.jp}</span></h2>
            <span class="chev" aria-hidden="true">{openGroups.includes(g.group) ? '−' : '+'}</span>
          </button>
          {#if openGroups.includes(g.group)}
            <div class="grids" class:two={tables.length === 2 && g.group !== 'extended'}>
              {#each tables as tbl (tbl.script)}
                {#if !(g.group === 'extended' && tbl.script !== 'katakana' && tables.length === 2)}
                  <div>
                    {#if tables.length === 2}<h3>
                        {t(SCRIPT_TITLE_KEY[tbl.script])}
                        <span class="jp" lang="ja">{SCRIPT_JP[tbl.script]}</span>
                      </h3>{/if}
                    <KanaTable
                      group={g.group}
                      script={g.group === 'extended' ? 'katakana' : tbl.script}
                      cards={cardsFor(g.group === 'extended' ? 'katakana' : tbl.script)}
                      selected={selected?.id}
                      onselect={select}
                    />
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {/each}
    {#if !s.groups.includes('extended') && !openGroups.includes('extended')}
      <button class="btn small ghost show-ext" onclick={() => toggleGroup('extended')}
        >{t('table.showExtended')}</button
      >
    {/if}
  </div>
  <aside class="side">
    {#if selected}
      <KanaDetails
        kana={selected}
        onstrokes={() => (strokesOpen = true)}
        onfonts={() => (fontsOpen = true)}
        onclose={() => (selected = undefined)}
      />
    {:else}
      <div class="panel hint">
        <p><strong>{t('table.tapHintBold')}</strong>{t('table.tapHintDetail')}</p>
        {#if s.tableMastery}
          <ul class="legend">
            <li><span class="dot learning"></span> {t('table.legendLearning')}</li>
            <li><span class="dot young"></span> {t('table.legendYoung')}</li>
            <li><span class="dot mature"></span> {t('table.legendMastered')}</li>
          </ul>
        {/if}
      </div>
    {/if}
  </aside>
</div>

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
      current={s.font}
    />
    {#if selected.hiragana}
      <div style="height: 1rem"></div>
      <FontGallery text={selected.katakana} fonts={FONTS.map((f) => f.id)} current={s.font} />
    {/if}
  </Modal>
{/if}

<style>
  .page-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .page-head h1 {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
    margin: 0;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
    text-shadow: 0 1px 6px rgb(0 0 0 / 0.5);
    margin-bottom: 0.2rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1.2rem;
    padding: 0.4rem 1rem 0.4rem 0.5rem;
  }

  .controls .switch {
    gap: 0.6rem;
    font-size: 0.9rem;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 1rem;
    align-items: start;
  }

  .tables {
    display: grid;
    gap: 1rem;
  }

  .group {
    padding: 0.5rem 1.1rem 1.1rem;
  }

  .group-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: none;
    border: 0;
    padding: 0.5rem 0;
    cursor: pointer;
    text-align: left;
  }

  .group-head h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .jp {
    font-size: 0.85rem;
    color: var(--ink-faint);
    margin-left: 0.35rem;
    font-weight: 400;
  }

  .chev {
    font-size: 1.3rem;
    color: var(--ink-faint);
    width: 1.5rem;
    text-align: center;
  }

  .grids {
    display: grid;
    gap: 1.25rem;
    margin-top: 0.4rem;
  }

  .grids.two {
    grid-template-columns: 1fr 1fr;
  }

  h3 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
  }

  .side {
    position: sticky;
    top: 80px;
  }

  .hint {
    padding: 1.1rem 1.25rem;
    font-size: 0.92rem;
  }

  .legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.35rem;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 4px;
  }

  .dot.learning {
    background: var(--level-learning);
  }

  .dot.young {
    background: var(--level-young);
  }

  .dot.mature {
    background: var(--level-mature);
  }

  .show-ext {
    justify-self: start;
    color: #fff;
    text-shadow: 0 1px 4px rgb(0 0 0 / 0.6);
  }

  .strokes {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  @media (max-width: 1000px) {
    .layout {
      grid-template-columns: 1fr;
    }

    /* The details float at the bottom of the screen while you scroll through the table. */
    .side {
      position: sticky;
      top: auto;
      bottom: 1rem;
      z-index: 5;
    }

    .side :global(.details) {
      max-height: 42vh;
      overflow: auto;
      box-shadow: var(--shadow);
    }

    .hint {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .side {
      bottom: calc(84px + env(safe-area-inset-bottom));
    }
  }

  @media (max-width: 760px) {
    .grids.two {
      grid-template-columns: 1fr;
    }
  }
</style>
