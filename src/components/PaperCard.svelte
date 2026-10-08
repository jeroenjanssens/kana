<script lang="ts">
  import type { Snippet } from 'svelte'
  import { washiStyle } from '../lib/ui/washi'

  /** A washi-paper flashcard with a 3D flip between `front` and `back`. */
  let {
    flipped = false,
    tilt = 0,
    paper = 0,
    label,
    front,
    back,
    onflip,
  }: {
    flipped?: boolean
    tilt?: number
    /** Seed for this card's sheet of paper (texture, rotation, offset). */
    paper?: number
    label: string
    front: Snippet
    back?: Snippet
    onflip?: () => void
  } = $props()
</script>

<div class="scene" style:--tilt="{tilt}deg">
  <div
    class="card"
    class:flipped
    role="button"
    tabindex="0"
    aria-label={label}
    aria-pressed={flipped}
    onclick={() => onflip?.()}
    onkeydown={(e) => {
      if (e.key === 'Enter' && e.target === e.currentTarget) onflip?.()
    }}
  >
    <div class="face front washi turn" style={washiStyle(paper)}>
      {@render front()}
    </div>
    <div class="face back washi turn" style={washiStyle(paper + 1)} aria-hidden={!flipped}>
      {#if back}{@render back()}{/if}
    </div>
  </div>
</div>

<style>
  .scene {
    perspective: 1400px;
    width: min(88vw, 400px);
    aspect-ratio: 5 / 6;
    transform: rotate(var(--tilt));
    transition: transform 0.4s var(--ease);
  }

  .card {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.7s var(--ease);
    cursor: pointer;
    border-radius: 18px;
    outline-offset: 6px;
  }

  .card.flipped {
    transform: rotateY(180deg);
  }

  .face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    border-radius: 18px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow:
      0 1px 1px rgb(60 40 10 / 0.1),
      0 10px 30px rgb(30 20 5 / 0.25),
      0 30px 60px rgb(30 20 5 / 0.18),
      inset 0 0 0 1px rgb(255 255 255 / 0.35),
      inset 0 0 40px rgb(120 90 40 / 0.08);
    overflow: hidden;
  }

  /* Faint deckle edge and a soft vignette, as on handmade paper. */
  .face::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow:
      inset 0 0 0 1px rgb(120 95 60 / 0.12),
      inset 0 0 24px rgb(120 95 60 / 0.1);
  }

  .back {
    transform: rotateY(180deg);
  }
</style>
