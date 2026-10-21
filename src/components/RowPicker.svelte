<script lang="ts">
  import type { RowOption } from '../lib/study/rows'

  /** Toggle chips for choosing table rows, each labelled with its first kana. */
  let {
    rows,
    katakana = false,
    both = false,
    selected = $bindable([]),
  }: {
    rows: RowOption[]
    katakana?: boolean
    /** Label each row in both scripts (か カ); rows without hiragana show only katakana. */
    both?: boolean
    selected?: string[]
  } = $props()

  function label(r: RowOption): string {
    const { hiragana, katakana: kata } = r.kana[0]
    if (both && hiragana) return `${hiragana} ${kata}`
    return katakana || !hiragana ? kata : hiragana
  }
</script>

<div class="rows">
  {#each rows as r (r.key)}
    <label class="row-chip" class:on={selected.includes(r.key)}>
      <input
        type="checkbox"
        checked={selected.includes(r.key)}
        onchange={(e) => {
          const on = (e.currentTarget as HTMLInputElement).checked
          selected = on ? [...selected, r.key] : selected.filter((k) => k !== r.key)
        }}
      />
      <span lang="ja">{label(r)}</span>
      <small>{r.kana[0].romaji}…</small>
    </label>
  {/each}
</div>

<style>
  .rows {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .row-chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    cursor: pointer;
    min-width: 56px;
    background: color-mix(in srgb, var(--paper) 50%, transparent);
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .row-chip input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .row-chip span {
    font-family: var(--font-kana);
    font-size: 1.4rem;
    line-height: 1.2;
  }

  .row-chip small {
    font-size: 0.7rem;
    color: var(--ink-faint);
  }

  .row-chip.on {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }

  .row-chip.on small {
    color: color-mix(in srgb, var(--paper) 70%, transparent);
  }

  .row-chip:focus-within {
    outline: 2px solid var(--ai);
    outline-offset: 2px;
  }
</style>
