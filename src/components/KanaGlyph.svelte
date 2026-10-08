<script lang="ts">
  import { fontFamily } from '../lib/data/fonts'

  /** A kana rendered as ink on paper in the given font. */
  let {
    text,
    font,
    size = '8rem',
    ink = true,
    lang = 'ja',
  }: { text: string; font: string; size?: string; ink?: boolean; lang?: string } = $props()
</script>

<span class="glyph" class:ink style:font-family={fontFamily(font)} style:font-size={size} {lang}
  >{text}</span
>

<style>
  .glyph {
    display: inline-block;
    line-height: 1.05;
    color: var(--ink);
    font-weight: 400;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .ink {
    filter: url(#ink);
    color: color-mix(in srgb, var(--ink) 92%, transparent);
  }

  :global(:root:not([data-theme='dark'])) .ink {
    mix-blend-mode: multiply;
  }
</style>
