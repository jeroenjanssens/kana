<script lang="ts">
  import { fade } from 'svelte/transition'
  import { dayKey } from '../lib/srs/scheduler'
  import { photoOfTheDay, prefersDataSaving, srcset, type Photo } from '../lib/ui/photos'
  import { settings } from '../state/app.svelte'
  import { ui } from '../state/ui.svelte'

  const base = import.meta.env.BASE_URL
  let photos = $state<Photo[]>([])

  $effect(() => {
    fetch(`${base}photos/credits.json`)
      .then((r) => r.json())
      .then((list: Photo[]) => (photos = list))
      .catch(() => (photos = []))
  })

  const saving = typeof navigator !== 'undefined' && prefersDataSaving(navigator as never)
  const show = $derived(
    settings().photos && !settings().calm && !(settings().dataSaver && saving) && photos.length > 0,
  )
  const index = $derived(
    photos.length
      ? (ui.pinnedPhoto ?? photoOfTheDay(dayKey(), photos.length) + ui.photoTick) % photos.length
      : 0,
  )
  const photo = $derived(photos[index])
</script>

<div class="backdrop washi" aria-hidden="true">
  {#if show && photo}
    {#key photo.slug}
      <div class="layer" style:background-color={photo.color} transition:fade={{ duration: 1600 }}>
        <picture>
          <source type="image/avif" srcset={srcset(base, photo.slug, 'avif')} sizes="100vw" />
          <img
            src="{base}photos/{photo.slug}-1280.webp"
            srcset={srcset(base, photo.slug, 'webp')}
            sizes="100vw"
            alt=""
            decoding="async"
          />
        </picture>
      </div>
    {/key}
    <div class="veil"></div>
  {/if}
</div>

{#if show && photo}
  <p class="credit">
    <span class="title">{photo.title}</span>
    <span>
      Photo by <a href={photo.photographerUrl} target="_blank" rel="noopener"
        >{photo.photographer}</a
      >
      on <a href={photo.sourceUrl} target="_blank" rel="noopener">Unsplash</a>
    </span>
  </p>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  picture,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  img {
    object-fit: cover;
    animation: drift 60s ease-in-out infinite alternate;
    transform-origin: 60% 40%;
  }

  @keyframes drift {
    from {
      transform: scale(1.03) translate3d(0, 0, 0);
    }
    to {
      transform: scale(1.14) translate3d(-1.5%, 1%, 0);
    }
  }

  .veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 40%, transparent 0%, rgb(20 16 10 / 0.25) 100%),
      linear-gradient(
        to bottom,
        rgb(20 16 10 / 0.25),
        rgb(20 16 10 / 0.05) 30%,
        rgb(20 16 10 / 0.35)
      );
  }

  :global([data-theme='dark']) .veil {
    background:
      radial-gradient(ellipse at 50% 40%, rgb(0 0 0 / 0.2) 0%, rgb(0 0 0 / 0.6) 100%),
      linear-gradient(to bottom, rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.25) 30%, rgb(0 0 0 / 0.6));
  }

  .credit {
    position: fixed;
    right: 14px;
    bottom: 10px;
    z-index: 1;
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.35;
    color: rgb(255 255 255 / 0.82);
    text-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
    text-align: right;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
  }

  .credit .title {
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .credit:hover .title {
    opacity: 1;
  }

  .credit a {
    color: inherit;
  }

  /* On phones the credit would cover content; photographers are listed on the credits page. */
  @media (max-width: 720px) {
    .credit {
      display: none;
    }
  }
</style>
