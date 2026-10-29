<script lang="ts">
  import { words, type Word } from '../lib/data/words'
  import type { MessageKey } from '../lib/i18n/messages'
  import { formatInterval, masteryLevel } from '../lib/srs/scheduler'
  import { glyphsText, wordMeaning, wordText, type WordKana } from '../lib/study/reading'
  import type { WordSort } from '../lib/study/scripts'
  import { matchesSearch, sortWords } from '../lib/study/wordReviews'
  import { audio, settings, store } from '../state/app.svelte'
  import { lang, t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'
  import VoiceButtons from './VoiceButtons.svelte'

  /**
   * Every practice word, in collapsible sections (hiragana words, katakana words, phrases):
   * sortable by any column, searchable, with both voices and how you're doing with each word.
   */
  let {
    unlocked,
    missing,
    onopen,
  }: {
    unlocked: readonly Word[]
    /** The kana each locked word still needs. */
    missing: (w: Word) => WordKana[]
    onopen: (w: Word, missing: WordKana[]) => void
  } = $props()

  const SECTIONS = ['hiragana', 'katakana', 'phrases'] as const
  type Section = (typeof SECTIONS)[number]
  const SORTS: WordSort[] = ['list', 'kana', 'romaji', 'meaning', 'progress', 'due']
  const COLUMNS: { sort: WordSort; label: MessageKey }[] = [
    { sort: 'kana', label: 'wordList.word' },
    { sort: 'romaji', label: 'wordList.romaji' },
    { sort: 'meaning', label: 'wordList.meaning' },
    { sort: 'progress', label: 'wordList.progress' },
  ]

  const s = $derived(settings())
  let query = $state('')
  const unlockedSet = $derived(new Set(unlocked))
  const now = Date.now()

  function sectionOf(w: Word): Section {
    return w.parts.length > 1 ? 'phrases' : w.script === 'katakana' ? 'katakana' : 'hiragana'
  }

  const sections = $derived.by(() => {
    const all = sortWords(words, s.wordListSort, s.wordListDesc, store.data, {
      lang: lang(),
      locked: (w) => !unlockedSet.has(w),
      now,
    })
    return SECTIONS.map((id) => {
      const inSection = all.filter((w) => sectionOf(w) === id)
      const shown = inSection.filter(
        (w) => (!s.wordListUnlocked || unlockedSet.has(w)) && matchesSearch(w, query, lang()),
      )
      const open = query.trim() ? shown.length > 0 : s.wordListOpen.includes(id)
      return {
        id,
        total: inSection.length,
        unlocked: inSection.filter((w) => unlockedSet.has(w)).length,
        mature: inSection.filter((w) => masteryLevel(store.data.words[w.kana]?.card) === 'mature')
          .length,
        shown,
        open,
      }
    }).filter((sec) => sec.total > 0)
  })

  function toggle(id: Section) {
    s.wordListOpen = s.wordListOpen.includes(id)
      ? s.wordListOpen.filter((x) => x !== id)
      : [...s.wordListOpen, id]
  }

  /** Click a column to sort by it; again to reverse; a third time back to list order. */
  function sortBy(sort: WordSort) {
    if (s.wordListSort !== sort) {
      s.wordListSort = sort
      s.wordListDesc = false
    } else if (!s.wordListDesc) {
      s.wordListDesc = true
    } else {
      s.wordListSort = 'list'
      s.wordListDesc = false
    }
  }

  function ariaSort(sort: WordSort) {
    if (s.wordListSort !== sort) return 'none'
    return s.wordListDesc ? 'descending' : 'ascending'
  }

  function status(w: Word) {
    const p = store.data.words[w.kana]
    const level = masteryLevel(p?.card)
    const due = p?.card && p.card.state !== 0 ? p.card.due : undefined
    return {
      level,
      seen: p?.seen ?? 0,
      correct: p?.correct ?? 0,
      due,
    }
  }
</script>

<div class="word-list">
  <div class="filters">
    <input
      type="search"
      bind:value={query}
      placeholder={t('wordList.search')}
      aria-label={t('wordList.search')}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
    <span class="sort">
      <select bind:value={s.wordListSort} aria-label={t('wordList.sortBy')}>
        {#each SORTS as sort (sort)}
          <option value={sort}>{t(`wordList.sort.${sort}` as MessageKey)}</option>
        {/each}
      </select>
      <button
        class="btn icon ghost small"
        onclick={() => (s.wordListDesc = !s.wordListDesc)}
        aria-label={s.wordListDesc ? t('wordList.descending') : t('wordList.ascending')}
        title={s.wordListDesc ? t('wordList.descending') : t('wordList.ascending')}
        >{s.wordListDesc ? '↓' : '↑'}</button
      >
    </span>
    <label class="check">
      <input type="checkbox" bind:checked={s.wordListUnlocked} />
      {t('wordList.unlockedOnly')}
    </label>
  </div>

  {#if query.trim() && sections.every((sec) => !sec.shown.length)}
    <p class="muted empty">{t('wordList.none')}</p>
  {/if}

  {#each sections as sec (sec.id)}
    <section class="section">
      <h3>
        <button
          class="toggle"
          aria-expanded={sec.open}
          onclick={() => toggle(sec.id)}
          disabled={!!query.trim()}
        >
          <span class="chevron" class:open={sec.open}><Icon name="right" size={16} /></span>
          <span class="name">{t(`wordList.section.${sec.id}` as MessageKey)}</span>
          <span class="muted summary"
            >{t('wordList.sectionSummary', {
              unlocked: sec.unlocked,
              total: sec.total,
              mature: sec.mature,
            })}</span
          >
        </button>
      </h3>
      {#if sec.open}
        {#if sec.shown.length}
          <table>
            <thead>
              <tr>
                {#each COLUMNS as col (col.sort)}
                  <th aria-sort={ariaSort(col.sort)} class={col.sort}>
                    <button onclick={() => sortBy(col.sort)}>
                      {t(col.label)}
                      {#if s.wordListSort === col.sort}<span aria-hidden="true"
                          >{s.wordListDesc ? '↓' : '↑'}</span
                        >{/if}
                    </button>
                  </th>
                {/each}
                <th class="listen">{t('common.listen')}</th>
              </tr>
            </thead>
            <tbody>
              {#each sec.shown as w (w.kana)}
                {@const st = status(w)}
                {@const isLocked = !unlockedSet.has(w)}
                <tr class:locked={isLocked}>
                  <td class="kana">
                    <button
                      lang="ja"
                      onclick={() => onopen(w, isLocked ? missing(w) : [])}
                      aria-label={t('reading.openWord', {
                        kana: w.kana,
                        romaji: w.romaji,
                        meaning: wordMeaning(w, lang()),
                      })}>{wordText(w, s.readingSpaces)}</button
                    >
                  </td>
                  <td class="romaji">{w.romaji}</td>
                  <td class="meaning">{wordMeaning(w, lang())}</td>
                  <td class="progress">
                    {#if isLocked}
                      <span class="needs" title={t('wordList.locked')}>
                        <Icon name="lock" size={13} />
                        <span lang="ja">{glyphsText(missing(w))}</span>
                      </span>
                    {:else}
                      <span
                        class="dot {st.level}"
                        title={t(`study.mastery.${st.level}` as MessageKey)}
                      ></span>
                      {#if st.seen}
                        <span class="score">{st.correct} / {st.seen}</span>
                        {#if st.due !== undefined}
                          <span class="muted due"
                            >{st.due <= now
                              ? t('wordList.due')
                              : t('wordList.dueIn', {
                                  time: formatInterval(st.due - now, lang()),
                                })}</span
                          >
                        {/if}
                      {:else}
                        <span class="muted">{t('wordList.new')}</span>
                      {/if}
                    {/if}
                  </td>
                  <td class="listen">
                    <VoiceButtons
                      label={w.kana}
                      play={(voice) => void audio.playWord(w.index, voice)}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="muted empty">{t('wordList.none')}</p>
        {/if}
      {/if}
    </section>
  {/each}
</div>

<style>
  .word-list {
    display: grid;
    gap: 0.6rem;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: center;
  }

  .filters input[type='search'] {
    flex: 1 1 14rem;
    border-radius: 999px;
    padding-inline: 1rem;
  }

  .sort {
    display: inline-flex;
    gap: 0.2rem;
    align-items: center;
  }

  .sort select {
    font-size: 0.9rem;
  }

  .check {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .section h3 {
    margin: 0;
  }

  .toggle {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.2rem 0.6rem;
    width: 100%;
    padding: 0.5rem 0.2rem;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .toggle:disabled {
    cursor: default;
  }

  .chevron {
    display: inline-flex;
    align-self: center;
    transition: transform 0.2s var(--ease);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .name {
    font-family: var(--font-heading);
    font-size: 1.1rem;
  }

  .summary {
    font-size: 0.8rem;
    font-weight: 400;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.3rem;
  }

  th {
    text-align: left;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
    font-weight: 600;
    padding: 0.3rem 0.4rem;
  }

  th button {
    border: 0;
    background: none;
    padding: 0;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
  }

  th[aria-sort='ascending'] button,
  th[aria-sort='descending'] button {
    color: var(--ink);
  }

  td {
    padding: 0.3rem 0.4rem;
    border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
    vertical-align: middle;
  }

  tr.locked td:not(.progress) {
    opacity: 0.55;
  }

  td.kana button {
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    padding: 0.1rem 0.35rem;
    font-family: var(--font-kana);
    font-size: 1.2rem;
    text-align: left;
    cursor: pointer;
  }

  td.kana button:hover {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }

  td.romaji {
    font-weight: 600;
  }

  td.meaning {
    color: var(--ink-soft);
  }

  td.progress {
    white-space: nowrap;
    font-size: 0.85rem;
  }

  .dot {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    margin-right: 0.3rem;
    vertical-align: -0.05rem;
    background: var(--level-new);
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

  .due {
    margin-left: 0.3rem;
  }

  .needs {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    color: var(--shu);
  }

  .needs span {
    font-family: var(--font-kana);
    font-size: 1rem;
  }

  td.listen {
    text-align: right;
  }

  /* The two voices stay side by side; the meaning wraps instead. */
  td.listen :global(.voices) {
    flex-wrap: nowrap;
  }

  th.listen {
    text-align: right;
  }

  .empty {
    margin: 0.5rem 0.2rem;
  }

  /* On a phone, each word takes two lines: the word and how you're doing, then its romaji,
     meaning and voices. */
  @media (max-width: 640px) {
    thead {
      display: none;
    }

    table,
    tbody {
      display: block;
    }

    tr {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas:
        'kana kana progress'
        'romaji meaning listen';
      align-items: center;
      gap: 0.1rem 0.5rem;
      padding: 0.4rem 0;
      border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
    }

    td {
      border: 0;
      padding: 0 0.2rem;
    }

    td.kana {
      grid-area: kana;
    }

    td.progress {
      grid-area: progress;
      text-align: right;
    }

    td.romaji {
      grid-area: romaji;
    }

    td.meaning {
      grid-area: meaning;
      font-size: 0.9rem;
      overflow-wrap: anywhere;
    }

    td.listen {
      grid-area: listen;
    }
  }
</style>
