<script lang="ts">
  import { washiStyle } from '../lib/ui/washi'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import { FONTS, FONT_STYLES, SYSTEM_FONT_ID } from '../lib/data/fonts'
  import type { KanaGroup } from '../lib/data/kana'
  import type { SfxEvent } from '../lib/audio/engine'
  import { pickVoice, type VoiceSetting } from '../lib/audio/voices'
  import { exportFileName, exportJson, importJson } from '../lib/storage/persistence'
  import { resetProgress } from '../lib/study/actions'
  import { reminderIcs } from '../lib/study/goal'
  import { loadFont } from '../lib/ui/fontLoader'
  import type { PhotoMode } from '../lib/ui/photos'
  import { install, isStandalone, onInstallAvailable } from '../lib/ui/pwa'
  import { choosePhoto, gallery, loadPhotos } from '../state/photos.svelte'
  import { audio, replaceData, settings, store } from '../state/app.svelte'
  import { toast } from '../state/ui.svelte'

  const s = $derived(settings())
  let fileInput = $state<HTMLInputElement>()
  let confirmReset = $state(false)
  let persisted = $state<boolean | undefined>()
  let canInstall = $state(false)
  const standalone = typeof window !== 'undefined' && isStandalone()

  $effect(() => onInstallAvailable((available) => (canInstall = available)))

  $effect(() => {
    void navigator.storage?.persisted?.().then((p) => (persisted = p))
  })

  $effect(() => {
    for (const f of FONTS) void loadFont(f.id)
    void loadPhotos()
  })

  const GROUPS: { id: KanaGroup; label: string; example: string }[] = [
    { id: 'basic', label: 'Basic', example: 'あ か さ' },
    { id: 'dakuten', label: 'Dakuten & handakuten', example: 'が ざ ぱ' },
    { id: 'yoon', label: 'Yōon', example: 'きゃ しゅ' },
    { id: 'extended', label: 'Extended katakana', example: 'ファ ティ' },
  ]

  const EFFECTS: { id: SfxEvent; label: string }[] = [
    { id: 'flip', label: 'Card flip' },
    { id: 'correct', label: 'Correct' },
    { id: 'wrong', label: 'Wrong' },
    { id: 'stamp', label: 'Seal' },
    { id: 'bell', label: 'Bell' },
    { id: 'complete', label: 'Session complete' },
    { id: 'milestone', label: 'Milestone' },
    { id: 'tick', label: 'UI tick' },
  ]

  const base = import.meta.env.BASE_URL
  const PHOTO_MODES: { id: PhotoMode; label: string }[] = [
    { id: 'cards', label: 'Cards' },
    { id: 'minutes', label: 'Timer' },
    { id: 'daily', label: 'Daily' },
    { id: 'fixed', label: 'Fixed' },
  ]

  const VOICE_OPTIONS: { id: VoiceSetting; label: string }[] = [
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
    { id: 'random', label: 'Random' },
  ]

  /** Switch voice and play a sample right away. */
  function chooseVoice(voice: VoiceSetting) {
    s.voice = voice
    void audio.playVoice('a', pickVoice(voice))
  }

  function toggleGroup(id: KanaGroup, on: boolean) {
    if (id === 'basic' && !on) return
    s.groups = on ? [...new Set([...s.groups, id])] : s.groups.filter((g) => g !== id)
  }

  function toggleRandomFont(id: string, on: boolean) {
    const next = on ? [...new Set([...s.randomFonts, id])] : s.randomFonts.filter((f) => f !== id)
    if (next.length) s.randomFonts = next
  }

  function downloadReminder() {
    const url = new URL(import.meta.env.BASE_URL, location.origin).href
    const ics = reminderIcs({ time: s.reminderTime || '19:00', url })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = 'kana-reminder.ics'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Open the downloaded file to add the reminder to your calendar')
  }

  function download() {
    const blob = new Blob([exportJson($state.snapshot(store.data))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    a.click()
    URL.revokeObjectURL(url)
    toast('Progress exported')
  }

  async function upload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = importJson(await file.text())
      replaceData(data)
      toast('Progress imported')
    } catch (err) {
      toast(`Import failed: ${(err as Error).message}`)
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  function reset() {
    resetProgress(store.data)
    confirmReset = false
    toast('Progress reset')
  }

  function playPreview(id: SfxEvent) {
    void audio.playSfx(id, { preview: true, ...(id === 'correct' ? { semitones: 12 } : {}) })
  }
</script>

<header class="page-head">
  <p class="eyebrow light">設定 · Settings</p>
  <h1>Settings</h1>
</header>

<div class="sections">
  <section class="panel block">
    <h2>Study</h2>
    <label class="field">
      <span>New cards per day <small class="muted">per deck</small></span>
      <input type="number" min="0" max="200" bind:value={s.newPerDay} />
    </label>
    <label class="field">
      <span>Maximum reviews per day <small class="muted">per deck</small></span>
      <input type="number" min="0" max="2000" bind:value={s.reviewsPerDay} />
    </label>
    <label class="field">
      <span>Daily goal <small class="muted">answers per day</small></span>
      <input type="number" min="5" max="500" step="5" bind:value={s.dailyGoal} />
    </label>
    <div class="field">
      <span>Daily reminder <small class="muted">adds an event to your calendar</small></span>
      <span class="reminder">
        <input type="time" bind:value={s.reminderTime} aria-label="Reminder time" />
        <button class="btn small" onclick={downloadReminder}>Add to calendar</button>
      </span>
    </div>
    <label class="field">
      <span>Mark as tricky after <small class="muted">times forgotten</small></span>
      <input type="number" min="2" max="20" bind:value={s.leechThreshold} />
    </label>
    <fieldset>
      <legend>Kana to learn</legend>
      {#each GROUPS as g (g.id)}
        <label class="switch">
          <span>{g.label} <span class="muted" lang="ja">{g.example}</span></span>
          <input
            type="checkbox"
            checked={s.groups.includes(g.id)}
            disabled={g.id === 'basic'}
            onchange={(e) => toggleGroup(g.id, (e.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      {/each}
    </fieldset>
    <div class="field">
      <span>Answer style</span>
      <div class="segmented" role="group" aria-label="Answer style">
        <button aria-pressed={s.answerStyle === 'self'} onclick={() => (s.answerStyle = 'self')}
          >Self-grade</button
        >
        <button aria-pressed={s.answerStyle === 'typed'} onclick={() => (s.answerStyle = 'typed')}
          >Type the romaji</button
        >
      </div>
    </div>
    <div class="field">
      <span>Romanisation</span>
      <div class="segmented" role="group" aria-label="Romanisation">
        <button aria-pressed={s.romaji === 'hepburn'} onclick={() => (s.romaji = 'hepburn')}
          >Hepburn (shi)</button
        >
        <button aria-pressed={s.romaji === 'kunrei'} onclick={() => (s.romaji = 'kunrei')}
          >Kunrei (si)</button
        >
      </div>
    </div>
    <label class="switch"
      ><span
        >Introduce new kana <small class="muted">sound, strokes and a memory hint first</small
        ></span
      ><input type="checkbox" bind:checked={s.introduce} /></label
    >
    <label class="switch"
      ><span>Play pronunciation when revealing a card</span><input
        type="checkbox"
        bind:checked={s.autoplay}
      /></label
    >
    <label class="switch"
      ><span>Show the other script on the back</span><input
        type="checkbox"
        bind:checked={s.showOtherScript}
      /></label
    >
  </section>

  <section class="panel block">
    <h2>Fonts</h2>
    <div class="field">
      <span>Card font</span>
      <div class="segmented" role="group" aria-label="Font mode">
        <button aria-pressed={s.fontMode === 'fixed'} onclick={() => (s.fontMode = 'fixed')}
          >One font</button
        >
        <button aria-pressed={s.fontMode === 'random'} onclick={() => (s.fontMode = 'random')}
          >Random fonts</button
        >
      </div>
    </div>
    <p class="muted small">
      {s.fontMode === 'fixed'
        ? 'Choose the font for cards and tables.'
        : 'Each card uses a random font from the ones you select, so you get used to many styles. The table uses the font marked as default.'}
    </p>
    <ul class="fonts">
      {#each [...FONTS.map( (f) => ({ id: f.id, name: f.name, style: FONT_STYLES[f.style] }) ), { id: SYSTEM_FONT_ID, name: 'System font', style: 'Your device' }] as f (f.id)}
        <li class:chosen={s.font === f.id}>
          <button
            class="sample washi turn"
            style={washiStyle(f.id)}
            onclick={() => (s.font = f.id)}
            aria-pressed={s.font === f.id}
            aria-label="Use {f.name} as default font"
          >
            <KanaGlyph text="あア" font={f.id} size="1.9rem" ink={false} />
          </button>
          <span class="name">{f.name}</span>
          <span class="muted tiny">{f.style}{s.font === f.id ? ' · default' : ''}</span>
          {#if s.fontMode === 'random' && f.id !== SYSTEM_FONT_ID}
            <label class="tiny check">
              <input
                type="checkbox"
                checked={s.randomFonts.includes(f.id)}
                onchange={(e) =>
                  toggleRandomFont(f.id, (e.currentTarget as HTMLInputElement).checked)}
              /> in rotation
            </label>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>Appearance</h2>
    <div class="field">
      <span>Theme</span>
      <div class="segmented" role="group" aria-label="Theme">
        <button aria-pressed={s.theme === 'system'} onclick={() => (s.theme = 'system')}
          >System</button
        >
        <button aria-pressed={s.theme === 'light'} onclick={() => (s.theme = 'light')}>Light</button
        >
        <button aria-pressed={s.theme === 'dark'} onclick={() => (s.theme = 'dark')}>Dark</button>
      </div>
    </div>
    <label class="switch"
      ><span>Photo backgrounds</span><input type="checkbox" bind:checked={s.photos} /></label
    >
    <div class="field">
      <span>Change the photo</span>
      <div class="segmented" role="group" aria-label="Change the photo">
        {#each PHOTO_MODES as m (m.id)}
          <button aria-pressed={s.photoMode === m.id} onclick={() => (s.photoMode = m.id)}
            >{m.label}</button
          >
        {/each}
      </div>
    </div>
    {#if s.photoMode === 'cards'}
      <label class="field">
        <span>Every <small class="muted">{s.photoEvery} cards</small></span>
        <input type="range" min="3" max="50" step="1" bind:value={s.photoEvery} />
      </label>
    {:else if s.photoMode === 'minutes'}
      <label class="field">
        <span>Every <small class="muted">{s.photoMinutes} minutes</small></span>
        <input type="range" min="1" max="60" step="1" bind:value={s.photoMinutes} />
      </label>
    {/if}
    <details class="picker">
      <summary>Choose a photo</summary>
      <ul class="thumbs">
        {#each gallery.photos as p (p.slug)}
          <li>
            <button
              class="thumb"
              aria-pressed={s.photoSlug === p.slug}
              aria-label={p.title}
              title={p.title}
              onclick={() => choosePhoto(p.slug)}
            >
              <img
                src="{base}photos/{p.slug}-640.webp"
                alt=""
                loading="lazy"
                style:background={p.color}
              />
            </button>
          </li>
        {/each}
      </ul>
    </details>
    <label class="switch"
      ><span>Calm mode <small class="muted">plain paper, no photos</small></span><input
        type="checkbox"
        bind:checked={s.calm}
      /></label
    >
    <label class="switch"
      ><span>Data saver <small class="muted">no photos on slow or metered connections</small></span
      ><input type="checkbox" bind:checked={s.dataSaver} /></label
    >
    <div class="field">
      <span>Reduce motion</span>
      <div class="segmented" role="group" aria-label="Reduce motion">
        <button
          aria-pressed={s.reducedMotion === 'system'}
          onclick={() => (s.reducedMotion = 'system')}>System</button
        >
        <button aria-pressed={s.reducedMotion === 'on'} onclick={() => (s.reducedMotion = 'on')}
          >On</button
        >
        <button aria-pressed={s.reducedMotion === 'off'} onclick={() => (s.reducedMotion = 'off')}
          >Off</button
        >
      </div>
    </div>
  </section>

  <section class="panel block">
    <h2>Sound</h2>
    <label class="switch"
      ><span>Sound effects <kbd>M</kbd></span><input type="checkbox" bind:checked={s.sfx} /></label
    >
    <label class="field">
      <span>Effects volume <small class="muted">{Math.round(s.sfxVolume * 100)}%</small></span>
      <input type="range" min="0" max="1" step="0.05" bind:value={s.sfxVolume} disabled={!s.sfx} />
    </label>
    <label class="field">
      <span
        >Pronunciation volume <small class="muted">{Math.round(s.voiceVolume * 100)}%</small></span
      >
      <input type="range" min="0" max="1" step="0.05" bind:value={s.voiceVolume} />
    </label>
    <div class="field">
      <span>Voice <small class="muted">random: a different speaker per card</small></span>
      <div class="segmented" role="group" aria-label="Voice">
        {#each VOICE_OPTIONS as v (v.id)}
          <button aria-pressed={s.voice === v.id} onclick={() => chooseVoice(v.id)}
            >{v.label}</button
          >
        {/each}
      </div>
    </div>
    <label class="switch"
      ><span>Soft clicks in menus</span><input type="checkbox" bind:checked={s.uiTicks} /></label
    >
    <label class="switch"
      ><span>Silent mode <small class="muted">mutes everything</small></span><input
        type="checkbox"
        bind:checked={s.silent}
      /></label
    >
    <p class="muted small">Preview the effects:</p>
    <div class="row">
      {#each EFFECTS as e (e.id)}
        <button class="btn small" onclick={() => playPreview(e.id)}>{e.label}</button>
      {/each}
    </div>
  </section>

  <section class="panel block">
    <h2>Your data</h2>
    <p class="muted small">
      Your progress is stored only in this browser{persisted === true
        ? ', and the browser has agreed to keep it'
        : ''}. Export it now and then as a backup, or to move it to another device.
    </p>
    <div class="row">
      <button class="btn" onclick={download}>Export progress</button>
      <button class="btn" onclick={() => fileInput?.click()}>Import progress</button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onchange={upload}
      />
      {#if confirmReset}
        <button class="btn shu" onclick={reset}>Yes, erase all progress</button>
        <button class="btn ghost" onclick={() => (confirmReset = false)}>Cancel</button>
      {:else}
        <button class="btn ghost danger" onclick={() => (confirmReset = true)}
          >Reset progress…</button
        >
      {/if}
    </div>
  </section>

  <section class="panel block">
    <h2>Install</h2>
    {#if standalone}
      <p class="small">kana is installed and works offline.</p>
    {:else if canInstall}
      <p class="small">
        Install kana as an app: it starts from your home screen and works offline.
      </p>
      <div class="row"><button class="btn primary" onclick={install}>Install kana</button></div>
    {:else}
      <p class="small">
        kana works offline once loaded. To install it, use your browser's “Install app” or, on
        iPhone and iPad, Share → “Add to Home Screen”. Installing on iOS also keeps Safari from
        clearing your progress.
      </p>
    {/if}
  </section>

  <section class="panel block">
    <h2>About</h2>
    <p class="small">
      kana is free and open source. Pronunciation, photos, fonts, stroke data and sound effects come
      from generous creators — see the <a href="#/credits">credits</a>. Press <kbd>?</kbd> for keyboard
      shortcuts.
    </p>
    <p class="small">
      <a href="https://github.com/jeroenjanssens/kana" target="_blank" rel="noopener"
        >Source code on GitHub</a
      >
    </p>
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
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 1rem;
    align-items: start;
  }

  .block {
    padding: 1.2rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .block h2 {
    font-size: 1.2rem;
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    min-height: 44px;
    flex-wrap: wrap;
  }

  .field:has(input[type='number']) {
    flex-wrap: nowrap;
  }

  .field input[type='number'] {
    width: 6rem;
    flex: none;
  }

  .field input[type='range'] {
    width: 100%;
  }

  fieldset {
    border: 0;
    padding: 0;
    margin: 0.4rem 0;
  }

  legend {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.2rem;
  }

  .small {
    font-size: 0.85rem;
    margin: 0.2rem 0;
  }

  .tiny {
    font-size: 0.7rem;
  }

  .fonts {
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 0.6rem;
  }

  .fonts li {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.1rem;
  }

  .sample {
    position: relative;
    width: 100%;
    height: 64px;
    border-radius: 10px;
    border: 1px solid var(--line);
    cursor: pointer;
    display: grid;
    place-items: center;
    color: var(--ink);
  }

  .chosen .sample {
    border-color: var(--shu);
    box-shadow: 0 0 0 2px var(--shu);
  }

  .name {
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.2;
    margin-top: 0.2rem;
  }

  .check {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .picker summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .thumbs {
    list-style: none;
    margin: 0.25rem 0 0.5rem;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 0.4rem;
  }

  .thumb {
    width: 100%;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    display: block;
  }

  .thumb[aria-pressed='true'] {
    border-color: var(--shu);
  }

  .thumb img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }

  .reminder {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
  }

  .danger {
    color: var(--shu);
  }
</style>
