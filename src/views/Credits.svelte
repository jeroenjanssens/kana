<script lang="ts">
  import { FONTS } from '../lib/data/fonts'
  import type { Photo } from '../lib/ui/photos'

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
  <p class="eyebrow light">感謝 · Thanks</p>
  <h1>Credits</h1>
  <p class="lead">kana is built on the generous work of these creators.</p>
</header>

<div class="sections">
  <section class="panel block">
    <h2>Pronunciation</h2>
    <p>
      Generated with <a href="https://voicevox.hiroshiba.jp" target="_blank" rel="noopener"
        >VOICEVOX</a
      >.
    </p>
    <ul class="list">
      {#each voices as v (v.id)}
        <li>
          {v.credit}
          <span class="muted"
            >· {v.id === 'female' ? 'female' : 'male'} voice ·
            <a href={v.terms} target="_blank" rel="noopener">terms</a></span
          >
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>Stroke order</h2>
    <p>
      Stroke data from <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener"
        >KanjiVG</a
      >
      by Ulrich Apel and contributors, licensed under
      <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener"
        >CC BY-SA 3.0</a
      >.
    </p>
  </section>

  <section class="panel block">
    <h2>Fonts</h2>
    <p>
      Japanese fonts from <a href="https://fonts.google.com" target="_blank" rel="noopener"
        >Google Fonts</a
      >, used under the SIL Open Font License (Kosugi Maru: Apache 2.0). Interface text is set in
      Inter.
    </p>
    <ul class="list">
      {#each FONTS as f (f.id)}
        <li>{f.name} <span class="muted">· {f.license}</span></li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>Sound effects</h2>
    <p>
      From <a href="https://freesound.org" target="_blank" rel="noopener">Freesound</a> (CC0), and a few
      generated for kana.
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
    <h2>Photos</h2>
    <p>
      All photos from <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>,
      used under the Unsplash License.
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
