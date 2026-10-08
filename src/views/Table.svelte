<script lang="ts">
  import FontGallery from '../components/FontGallery.svelte'
  import KanaDetails from '../components/KanaDetails.svelte'
  import KanaTable from '../components/KanaTable.svelte'
  import Modal from '../components/Modal.svelte'
  import StrokeOrder from '../components/StrokeOrder.svelte'
  import { FONTS } from '../lib/data/fonts'
  import type { Kana, KanaGroup } from '../lib/data/kana'
  import { audio, settings, store } from '../state/app.svelte'

  const s = $derived(settings())
  const GROUPS: { group: KanaGroup; title: string; jp: string }[] = [
    { group: 'basic', title: 'Basic', jp: '清音' },
    { group: 'dakuten', title: 'Dakuten & handakuten', jp: '濁音・半濁音' },
    { group: 'yoon', title: 'Yōon', jp: '拗音' },
    { group: 'extended', title: 'Extended katakana', jp: '外来音' },
  ]
  let openGroups = $state<KanaGroup[]>(['basic', 'dakuten', 'yoon'])
  let selected = $state<Kana | undefined>()
  let strokesOpen = $state(false)
  let fontsOpen = $state(false)

  function select(k: Kana) {
    selected = k
    if (k.audio) void audio.playVoice(k.id)
  }

  function toggleGroup(g: KanaGroup) {
    openGroups = openGroups.includes(g) ? openGroups.filter((x) => x !== g) : [...openGroups, g]
  }

  const tables = $derived(
    s.tableLayout === 'combined'
      ? [{ script: 'combined' as const, title: 'Hiragana · Katakana', jp: 'ひらがな・カタカナ' }]
      : [
          { script: 'hiragana' as const, title: 'Hiragana', jp: 'ひらがな' },
          { script: 'katakana' as const, title: 'Katakana', jp: 'カタカナ' },
        ],
  )

  function cardsFor(script: 'hiragana' | 'katakana' | 'combined') {
    if (!s.tableMastery) return undefined
    const deck = script === 'combined' ? s.tableMasteryDeck : script
    return store.data.cards[deck] ?? {}
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow light">五十音図 · Gojūon</p>
    <h1>Kana table</h1>
  </div>
  <div class="controls panel">
    <div class="segmented" role="group" aria-label="Layout">
      <button
        aria-pressed={s.tableLayout === 'separate'}
        onclick={() => (s.tableLayout = 'separate')}>Separate</button
      >
      <button
        aria-pressed={s.tableLayout === 'combined'}
        onclick={() => (s.tableLayout = 'combined')}>Combined</button
      >
    </div>
    <label class="switch"
      ><span>Romaji</span><input type="checkbox" bind:checked={s.tableRomaji} /></label
    >
    <label class="switch"
      ><span>Mastery</span><input type="checkbox" bind:checked={s.tableMastery} /></label
    >
    {#if s.tableLayout === 'combined' && s.tableMastery}
      <label class="select">
        <span class="visually-hidden">Colour by deck</span>
        <select bind:value={s.tableMasteryDeck} aria-label="Colour mastery by deck">
          <option value="combined">Combined deck</option>
          <option value="hiragana">Hiragana deck</option>
          <option value="katakana">Katakana deck</option>
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
            <h2>{g.title} <span class="jp" lang="ja">{g.jp}</span></h2>
            <span class="chev" aria-hidden="true">{openGroups.includes(g.group) ? '−' : '+'}</span>
          </button>
          {#if openGroups.includes(g.group)}
            <div class="grids" class:two={tables.length === 2 && g.group !== 'extended'}>
              {#each tables as t (t.script)}
                {#if !(g.group === 'extended' && t.script !== 'katakana' && tables.length === 2)}
                  <div>
                    {#if tables.length === 2}<h3>
                        {t.title} <span class="jp" lang="ja">{t.jp}</span>
                      </h3>{/if}
                    <KanaTable
                      group={g.group}
                      script={g.group === 'extended' ? 'katakana' : t.script}
                      cards={cardsFor(g.group === 'extended' ? 'katakana' : t.script)}
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
        >Show extended katakana</button
      >
    {/if}
  </div>
  <aside class="side">
    {#if selected}
      <KanaDetails
        kana={selected}
        onstrokes={() => (strokesOpen = true)}
        onfonts={() => (fontsOpen = true)}
      />
    {:else}
      <div class="panel hint">
        <p><strong>Tap a kana</strong> to hear it and see how well you know it.</p>
        {#if s.tableMastery}
          <ul class="legend">
            <li><span class="dot learning"></span> Learning</li>
            <li><span class="dot young"></span> Young</li>
            <li><span class="dot mature"></span> Mastered (21+ days)</li>
          </ul>
        {/if}
      </div>
    {/if}
  </aside>
</div>

{#if selected}
  <Modal bind:open={strokesOpen} title="Stroke order">
    <div class="strokes">
      {#if selected.hiragana}<StrokeOrder text={selected.hiragana} size={180} />{/if}
      <StrokeOrder text={selected.katakana} size={180} />
    </div>
  </Modal>
  <Modal bind:open={fontsOpen} title="Font gallery" wide>
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

    .side {
      position: sticky;
      top: auto;
      bottom: calc(80px + env(safe-area-inset-bottom));
      order: -1;
    }
  }

  @media (max-width: 760px) {
    .grids.two {
      grid-template-columns: 1fr;
    }
  }
</style>
