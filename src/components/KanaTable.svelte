<script lang="ts">
  import { washiStyle } from '../lib/ui/washi'
  import {
    COLUMN_LABELS,
    YOON_COLUMN_LABELS,
    displayRomaji,
    rowsOf,
    type Kana,
    type KanaGroup,
  } from '../lib/data/kana'
  import { masteryLevel } from '../lib/srs/scheduler'
  import type { CardRecord } from '../lib/storage/schema'
  import { settings } from '../state/app.svelte'
  import Hanko from './Hanko.svelte'
  import KanaGlyph from './KanaGlyph.svelte'

  let {
    group,
    script,
    cards,
    selected,
    onselect,
  }: {
    group: KanaGroup
    script: 'hiragana' | 'katakana' | 'combined'
    /** Cards used to colour the cells by mastery (undefined: no colouring). */
    cards?: Record<string, CardRecord>
    selected?: string
    onselect: (kana: Kana) => void
  } = $props()

  const s = $derived(settings())
  const columns = $derived(group === 'yoon' ? YOON_COLUMN_LABELS : COLUMN_LABELS)
  const rows = $derived(
    rowsOf(group)
      .map(({ row, kana }) => {
        const cells: (Kana | undefined)[] = Array(columns.length).fill(undefined)
        for (const k of kana) if (script !== 'hiragana' || k.hiragana) cells[k.col] = k
        return { row, cells }
      })
      .filter((r) => r.cells.some(Boolean)),
  )

  function text(k: Kana) {
    return script === 'katakana' ? k.katakana : k.hiragana
  }
</script>

<div class="table" style:--cols={columns.length} role="group" aria-label="{script} {group}">
  <div class="head" aria-hidden="true">
    <span></span>
    {#each columns as c (c)}<span class="col-label">{c}</span>{/each}
  </div>
  {#each rows as r (r.row)}
    <div class="row">
      <span class="row-label" role="rowheader"
        >{r.cells.find(Boolean)?.romaji.replace(/[aiueo]$/, '') || '·'}</span
      >
      {#each r.cells as k, i (i)}
        {#if k}
          {@const level = cards ? masteryLevel(cards[k.id]) : 'new'}
          <button
            class="cell washi turn level-{level}"
            style={washiStyle(`${script}:${k.id}`)}
            class:selected={selected === k.id}
            class:pair={script === 'combined'}
            onclick={() => onselect(k)}
            aria-label="{script === 'combined'
              ? `${k.hiragana} ${k.katakana}`
              : text(k)}, {k.romaji}{cards ? `, ${level}` : ''}"
          >
            <span class="glyphs">
              {#if script === 'combined'}
                <KanaGlyph text={k.hiragana} font={s.font} size="1.7rem" ink={false} />
                <KanaGlyph text={k.katakana} font={s.font} size="1.7rem" ink={false} />
              {:else}
                <KanaGlyph text={text(k)} font={s.font} size="2.1rem" ink={false} />
              {/if}
            </span>
            {#if s.tableRomaji}<span class="romaji">{displayRomaji(k, s.romaji)}</span>{/if}
            {#if cards && level === 'mature'}<span class="seal"><Hanko size={18} /></span>{/if}
          </button>
        {:else}
          <span class="cell empty" aria-hidden="true"></span>
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .table {
    display: grid;
    gap: 6px;
  }

  .head,
  .row {
    display: grid;
    grid-template-columns: 2.2rem repeat(var(--cols), minmax(0, 1fr));
    gap: 6px;
  }

  .col-label,
  .row-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-faint);
    text-transform: lowercase;
    display: grid;
    place-items: center;
  }

  .cell {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 10px;
    min-height: 74px;
    padding: 0.35rem 0.2rem 0.3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    cursor: pointer;
    transition:
      transform 0.15s var(--ease),
      box-shadow 0.2s,
      border-color 0.2s;
    color: var(--ink);
  }

  .cell:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-soft);
  }

  .cell.selected {
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--ink);
  }

  .cell.empty {
    border: 1px dashed color-mix(in srgb, var(--ink) 8%, transparent);
    background: transparent;
    cursor: default;
  }

  .glyphs {
    display: flex;
    gap: 0.25rem;
  }

  .romaji {
    font-size: 0.75rem;
    color: var(--ink-soft);
    letter-spacing: 0.02em;
  }

  .level-learning {
    background-color: color-mix(in srgb, var(--level-learning) 28%, var(--paper));
  }

  .level-young {
    background-color: color-mix(in srgb, var(--level-young) 32%, var(--paper));
  }

  .level-mature {
    background-color: color-mix(in srgb, var(--level-mature) 30%, var(--paper));
  }

  .seal {
    position: absolute;
    top: 3px;
    right: 3px;
  }

  @media (max-width: 560px) {
    .cell {
      min-height: 60px;
      border-radius: 8px;
    }

    .head,
    .row {
      grid-template-columns: 1.4rem repeat(var(--cols), minmax(0, 1fr));
      gap: 4px;
    }

    .table {
      gap: 4px;
    }
  }
</style>
