<script lang="ts">
  import { t } from '../state/i18n.svelte'

  /** A red inkan-style seal. `stamp` plays the stamping animation when it appears. */
  let {
    text = '熟',
    size = 56,
    stamp = false,
    title,
  }: { text?: string; size?: number; stamp?: boolean; title?: string } = $props()

  const displayTitle = $derived(title ?? t('study.hanko.mastered'))
</script>

<span
  class="hanko"
  class:stamp
  style:--size="{size}px"
  title={displayTitle}
  role="img"
  aria-label={displayTitle}
>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <filter id="hanko-rough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.35" />
        <feComposite in="SourceGraphic" operator="in" />
      </filter>
    </defs>
    <g filter="url(#hanko-rough)">
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="12"
        fill="none"
        stroke="currentColor"
        stroke-width="7"
      />
      <text
        x="50"
        y="52"
        text-anchor="middle"
        dominant-baseline="central"
        font-size={text.length > 1 ? 38 : 60}
        fill="currentColor">{text}</text
      >
    </g>
  </svg>
</span>

<style>
  .hanko {
    display: inline-block;
    width: var(--size);
    height: var(--size);
    color: var(--shu);
    transform: rotate(-8deg);
    mix-blend-mode: multiply;
    font-family: var(--font-heading);
    flex: none;
  }

  :global([data-theme='dark']) .hanko {
    mix-blend-mode: normal;
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .stamp {
    animation: stamp 0.55s var(--ease) both;
  }

  @keyframes stamp {
    0% {
      opacity: 0;
      transform: rotate(-8deg) scale(2.2);
    }
    55% {
      opacity: 1;
      transform: rotate(-8deg) scale(0.92);
    }
    75% {
      transform: rotate(-8deg) scale(1.04);
    }
    100% {
      opacity: 1;
      transform: rotate(-8deg) scale(1);
    }
  }
</style>
