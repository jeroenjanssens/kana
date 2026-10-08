<script lang="ts">
  import { untrack } from 'svelte'
  import { FONTS, FONT_STYLES, SYSTEM_FONT_ID } from '../lib/data/fonts'
  import { loadFont } from '../lib/ui/fontLoader'
  import KanaGlyph from './KanaGlyph.svelte'

  /** The same kana in many fonts, so you learn to recognise it in any style. */
  let {
    text,
    fonts = FONTS.map((f) => f.id),
    compact = false,
    current,
  }: { text: string; fonts?: string[]; compact?: boolean; current?: string } = $props()

  const entries = $derived(
    [...fonts, SYSTEM_FONT_ID].map((id) => {
      const font = FONTS.find((f) => f.id === id)
      return {
        id,
        name: font?.name ?? 'System font',
        style: font ? FONT_STYLES[font.style] : 'Your device',
      }
    }),
  )

  let ready = $state<Record<string, boolean>>({})
  $effect(() => {
    for (const e of entries) {
      if (untrack(() => ready[e.id])) continue
      void loadFont(e.id).then((ok) => (ready[e.id] = ok || e.id === SYSTEM_FONT_ID))
    }
  })
</script>

<ul class="gallery" class:compact aria-label="{text} in different fonts">
  {#each entries as e (e.id)}
    <li class:current={e.id === current} class:loading={!ready[e.id]}>
      <KanaGlyph {text} font={e.id} size={compact ? '2.1rem' : '3.4rem'} ink={!compact} />
      <span class="name">{e.name}</span>
      {#if !compact}<span class="style">{e.style}</span>{/if}
    </li>
  {/each}
</ul>

<style>
  .gallery {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.75rem;
  }

  .gallery.compact {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 0.25rem;
    scrollbar-width: thin;
  }

  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.9rem 0.5rem 0.7rem;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--paper) 75%, transparent);
    border: 1px solid var(--line);
    scroll-snap-align: start;
    transition: opacity 0.3s;
  }

  .compact li {
    flex: none;
    min-width: 76px;
    padding: 0.4rem 0.4rem 0.3rem;
  }

  li.current {
    border-color: var(--shu);
    box-shadow: 0 0 0 1px var(--shu);
  }

  li.loading {
    opacity: 0.35;
  }

  .name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-soft);
    text-align: center;
    line-height: 1.2;
  }

  .compact .name {
    font-size: 0.6rem;
    font-weight: 500;
  }

  .style {
    font-size: 0.66rem;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
