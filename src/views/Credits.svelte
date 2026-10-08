<script lang="ts">
  import { FONTS } from '../lib/data/fonts'
  import type { Photo } from '../lib/ui/photos'
  import { t } from '../state/i18n.svelte'

  const base = import.meta.env.BASE_URL
  let photos = $state<Photo[]>([])
  let sfx = $state<
    { id: string; title: string; author: string; sourceUrl: string; license: string }[]
  >([])

  let voices = $state<{ id: string; credit: string; terms: string }[]>([])

  $effect(() => {
    fetch(`${base}audio/SOURCES.json`)
      .then((r) => r.json())
      .then((s) => (voices = Object.values(s.voices)))
      .catch(() => {})
    fetch(`${base}photos/credits.json`)
      .then((r) => r.json())
      .then((p) => (photos = p))
      .catch(() => {})
    fetch(`${base}sfx/manifest.json`)
      .then((r) => r.json())
      .then((m) => (sfx = m.credits ?? []))
      .catch(() => {})
  })
</script>

<header class="page-head">
  <p class="eyebrow light">{t('misc.creditsEyebrow')}</p>
  <h1>{t('misc.creditsHeading')}</h1>
  <p class="lead">{t('misc.creditsLead')}</p>
</header>

<div class="sections">
  <section class="panel block">
    <h2>{t('misc.pronunciationHeading')}</h2>
    <p>
      {t('misc.pronunciationGeneratedWith')}
      <a href="https://voicevox.hiroshiba.jp" target="_blank" rel="noopener">VOICEVOX</a>.
    </p>
    <ul class="list">
      {#each voices as v (v.id)}
        <li>
          {v.credit}
          <span class="muted"
            >· {v.id === 'female' ? t('misc.femaleVoice') : t('misc.maleVoice')} ·
            <a href={v.terms} target="_blank" rel="noopener">{t('misc.terms')}</a></span
          >
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>{t('misc.strokeOrderHeading')}</h2>
    <p>
      {t('misc.strokeDataFrom')}
      <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a>
      {t('misc.byContributors')}
      <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener"
        >CC BY-SA 3.0</a
      >.
    </p>
  </section>

  <section class="panel block">
    <h2>{t('misc.fontsHeading')}</h2>
    <p>
      {t('misc.japaneseFontsFrom')}
      <a href="https://fonts.google.com" target="_blank" rel="noopener">Google Fonts</a>{t(
        'misc.fontsLicenseNote',
      )}
    </p>
    <ul class="list">
      {#each FONTS as f (f.id)}
        <li>{f.name} <span class="muted">· {f.license}</span></li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>{t('misc.sfxHeading')}</h2>
    <p>
      {t('misc.sfxFrom')}
      <a href="https://freesound.org" target="_blank" rel="noopener">Freesound</a>
      {t('misc.sfxDesc2')}
    </p>
    <ul class="list">
      {#each sfx as s (s.id)}
        <li>
          {#if s.sourceUrl}<a href={s.sourceUrl} target="_blank" rel="noopener">{s.title}</a
            >{:else}{s.title}{/if}
          <span class="muted">· {s.author} · {s.license}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel block wide">
    <h2>{t('misc.photosHeading')}</h2>
    <p>
      {t('misc.allPhotosFrom')}
      <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>{t(
        'misc.photosLicense',
      )}
    </p>
    <ul class="photos">
      {#each photos as p (p.slug)}
        <li>
          <img
            src="{base}photos/{p.slug}-640.webp"
            alt={p.title}
            loading="lazy"
            width="320"
            height="200"
            style:background={p.color}
          />
          <span>
            <a href={p.sourceUrl} target="_blank" rel="noopener">{p.title}</a><br />
            <span class="muted"
              >by <a href={p.photographerUrl} target="_blank" rel="noopener">{p.photographer}</a
              ></span
            >
          </span>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1rem;
  }

  .block {
    padding: 1.2rem 1.4rem;
    font-size: 0.92rem;
  }

  .block h2 {
    font-size: 1.15rem;
  }

  .wide {
    grid-column: 1 / -1;
  }

  .list {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.85rem;
  }

  .photos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.9rem;
  }

  .photos li {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .photos img {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    border-radius: 8px;
  }
</style>
