<script lang="ts">
  import { fade } from 'svelte/transition'
  import { prefersDataSaving, srcset } from '../lib/ui/photos'
  import { settings } from '../state/app.svelte'
  import { gallery, loadPhotos, showPhoto } from '../state/photos.svelte'
  import { route } from '../state/router.svelte'
  import { ui } from '../state/ui.svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  const base = import.meta.env.BASE_URL

  $effect(() => {
    void loadPhotos()
  })

  const saving = typeof navigator !== 'undefined' && prefersDataSaving(navigator as never)
  const s = $derived(settings())
  const photos = $derived(gallery.photos)
  const show = $derived(s.photos && !s.calm && !(s.dataSaver && saving) && photos.length > 0)
  const index = $derived(
    Math.max(
      0,
      photos.findIndex((p) => p.slug === s.photoSlug),
    ),
  )
  const photo = $derived(photos[index])
  const upcoming = $derived(photos.length ? photos[(index + 1) % photos.length] : undefined)
  const width =
    typeof window === 'undefined' ? 1280 : window.innerWidth * (window.devicePixelRatio || 1)
  const size = width <= 700 ? 640 : width <= 1400 ? 1280 : 1920
  /** On phones the arrows only show on Home and the Table, never during a session. */
  const quietPage = $derived(ui.focus || !['', 'table'].includes(route.segments[0] ?? ''))

  // Warm the cache with the next photo so the cross-fade never waits for the network.
  $effect(() => {
    if (!show || !upcoming) return
    const timer = setTimeout(() => {
      const img = new Image()
      img.src = `${base}photos/${upcoming.slug}-${size}.avif`
    }, 4000)
    return () => clearTimeout(timer)
  })

  // "Every N minutes" mode.
  $effect(() => {
    if (!show || s.photoMode !== 'minutes') return
    const timer = setInterval(() => showPhoto(1), Math.max(1, s.photoMinutes) * 60_000)
    return () => clearInterval(timer)
  })
</script>

<div class="backdrop washi" aria-hidden="true" data-photo={show ? photo?.slug : undefined}>
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
            fetchpriority="low"
          />
        </picture>
      </div>
    {/key}
    <div class="veil"></div>
  {/if}
</div>

{#if show && photo}
  <div class="corner" class:quiet={quietPage}>
    <p class="credit">
      <span class="title">{photo.title}</span>
      <span>
        {t('misc.photoBy')}
        <a href={photo.photographerUrl} target="_blank" rel="noopener">{photo.photographer}</a>
        {t('misc.photoOn')} <a href={photo.sourceUrl} target="_blank" rel="noopener">Unsplash</a>
      </span>
    </p>
    <div class="arrows">
      <button
        class="arrow"
        onclick={() => showPhoto(-1)}
        aria-label={t('misc.previousPhoto')}
        title={t('misc.previousPhoto')}
      >
        <Icon name="left" size={16} />
      </button>
      <button
        class="arrow"
        onclick={() => showPhoto(1)}
        aria-label={t('misc.nextPhoto')}
        title={t('misc.nextPhoto')}
      >
        <Icon name="right" size={16} />
      </button>
    </div>
  </div>
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

  .corner {
    position: fixed;
    right: 14px;
    bottom: 10px;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .credit {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.35;
    color: rgb(255 255 255 / 0.82);
    text-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
    text-align: right;
    display: flex;
    flex-direction: column;
  }

  .credit .title {
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .corner:hover .credit .title {
    opacity: 1;
  }

  .credit a {
    color: inherit;
  }

  .arrows {
    display: flex;
    gap: 4px;
  }

  .arrow {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid rgb(255 255 255 / 0.35);
    background: rgb(20 15 10 / 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
  }

  .arrow:hover {
    background: rgb(20 15 10 / 0.55);
  }

  /* On phones the credit would cover content (photographers are listed on the credits page);
     the arrows stay, small, on Home and the Table only. */
  @media (max-width: 720px) {
    .credit {
      display: none;
    }

    .corner {
      bottom: calc(82px + env(safe-area-inset-bottom));
      right: 10px;
    }

    .corner.quiet {
      display: none;
    }

    .arrow {
      opacity: 0.75;
    }
  }
</style>
