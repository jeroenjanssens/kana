<script lang="ts">
  import { loadDrawing, type DrawingData } from '../lib/data/drawings'
  import type { Script } from '../lib/data/kana'

  /**
   * A kana with its memory-hint drawing, in the space the glyph would take. The drawing has its
   * own kana underneath (in a soft tint), so the lines always sit on the strokes.
   */
  let {
    id,
    script,
    text,
    size = '8rem',
    lang = 'ja',
  }: { id: string; script: Script; text: string; size?: string; lang?: string } = $props()

  let drawing = $state<DrawingData>()

  $effect(() => {
    const want = `${script}/${id}`
    drawing = undefined
    loadDrawing(id, script).then((d) => {
      if (want === `${script}/${id}`) drawing = d
    })
  })
</script>

<span class="drawing" style:font-size={size}
  ><span class="visually-hidden" {lang}>{text}</span>{#if drawing}<svg
      class="art"
      viewBox={drawing.viewBox}
      aria-hidden="true"
      ><g transform={drawing.transform}
        ><path class="paper" d={drawing.paper} /><path class="tint" d={drawing.tint} /><path
          class="ink"
          d={drawing.ink}
        /></g
      ></svg
    >{/if}</span
>

<style>
  .drawing {
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1.05em;
    vertical-align: middle;
  }

  .art {
    position: absolute;
    top: 0.025em;
    left: 0;
    display: block;
    width: 1em;
    height: 1em;
    overflow: visible;
    animation: draw-in 0.5s var(--ease) both;
  }

  .paper {
    fill: var(--paper);
  }

  .tint {
    fill: color-mix(in oklch, var(--ai) 30%, var(--paper));
  }

  .ink {
    fill: color-mix(in srgb, var(--ink) 94%, transparent);
  }

  :global(:root:not([data-theme='dark'])) .art {
    mix-blend-mode: multiply;
  }

  @keyframes draw-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
