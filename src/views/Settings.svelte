<script lang="ts">
  import { washiStyle } from '../lib/ui/washi'
  import KanaGlyph from '../components/KanaGlyph.svelte'
  import { FONTS, SYSTEM_FONT_ID } from '../lib/data/fonts'
  import type { KanaGroup } from '../lib/data/kana'
  import type { SfxEvent } from '../lib/audio/engine'
  import { pickVoice, type VoiceSetting } from '../lib/audio/voices'
  import { exportFileName, exportJson, importJson } from '../lib/storage/persistence'
  import { resetProgress } from '../lib/study/actions'
  import { reminderIcs } from '../lib/study/goal'
  import { MIN_REVIEWS, scheduledReviews, trainingData } from '../lib/srs/optimizer'
  import type { ReviewEntry } from '../lib/storage/schema'
  import { loadFont } from '../lib/ui/fontLoader'
  import type { PhotoMode } from '../lib/ui/photos'
  import { install, isStandalone, onInstallAvailable } from '../lib/ui/pwa'
  import { choosePhoto, gallery, loadPhotos } from '../state/photos.svelte'
  import { connect, disconnect, sync, syncNow } from '../state/sync.svelte'
  import { audio, replaceData, settings, store } from '../state/app.svelte'
  import { toast } from '../state/ui.svelte'
  import { t, lang } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  const s = $derived(settings())
  let fileInput = $state<HTMLInputElement>()
  let confirmReset = $state(false)
  let persisted = $state<boolean | undefined>()
  let token = $state('')
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

  const GROUPS: { id: KanaGroup; example: string }[] = [
    { id: 'basic', example: 'あ か さ' },
    { id: 'dakuten', example: 'が ざ ぱ' },
    { id: 'yoon', example: 'きゃ しゅ' },
    { id: 'extended', example: 'ファ ティ' },
  ]

  const EFFECTS: { id: SfxEvent }[] = [
    { id: 'flip' },
    { id: 'easy' },
    { id: 'good' },
    { id: 'hard' },
    { id: 'wrong' },
    { id: 'stamp' },
    { id: 'bell' },
    { id: 'complete' },
    { id: 'milestone' },
    { id: 'tick' },
  ]

  const base = import.meta.env.BASE_URL
  const PHOTO_MODES: { id: PhotoMode }[] = [
    { id: 'cards' },
    { id: 'minutes' },
    { id: 'daily' },
    { id: 'fixed' },
  ]

  const VOICE_OPTIONS: { id: VoiceSetting }[] = [{ id: 'female' }, { id: 'male' }, { id: 'random' }]

  const fontList = $derived([
    ...FONTS.map((f) => ({
      id: f.id,
      name: f.name,
      styleLabel: t(`settings.fontStyle.${f.style}` as MessageKey),
      isSystem: false,
    })),
    {
      id: SYSTEM_FONT_ID,
      name: t('settings.systemFont'),
      styleLabel: t('settings.systemFontStyle'),
      isSystem: true,
    },
  ])

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

  const reviews = $derived(scheduledReviews(store.data.log))
  let optimising = $state(false)

  async function optimise() {
    optimising = true
    try {
      const { optimizeWeights } = await import('../lib/srs/optimize')
      const data = trainingData($state.snapshot(store.data.log) as ReviewEntry[])
      s.fsrsWeights = await optimizeWeights(data)
      s.optimizedAt = Date.now()
      s.optimizedReviews = data.reviews
      toast(t('settings.toast.optimised'))
    } catch (err) {
      toast(t('settings.toast.optimiseFailed', { error: (err as Error).message }))
    } finally {
      optimising = false
    }
  }

  function resetWeights() {
    s.fsrsWeights = []
    s.optimizedAt = 0
    s.optimizedReviews = 0
    toast(t('settings.toast.resetWeights'))
  }

  function downloadReminder() {
    const url = new URL(import.meta.env.BASE_URL, location.origin).href
    const ics = reminderIcs({ time: s.reminderTime || '19:00', url })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = 'kana-reminder.ics'
    a.click()
    URL.revokeObjectURL(a.href)
    toast(t('settings.toast.reminder'))
  }

  function download() {
    const blob = new Blob([exportJson($state.snapshot(store.data))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    a.click()
    URL.revokeObjectURL(url)
    toast(t('settings.toast.exported'))
  }

  async function upload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = importJson(await file.text())
      replaceData(data)
      toast(t('settings.toast.imported'))
    } catch (err) {
      toast(t('settings.toast.importFailed', { error: (err as Error).message }))
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  function reset() {
    resetProgress(store.data)
    confirmReset = false
    toast(t('settings.toast.reset'))
  }

  function playPreview(id: SfxEvent) {
    void audio.playSfx(id, { preview: true })
  }

  function dateLocale(): string {
    return lang() === 'nl' ? 'nl-NL' : 'en-GB'
  }
</script>

<header class="page-head">
  <p class="eyebrow light">{t('settings.eyebrow')}</p>
  <h1>{t('settings.title')}</h1>
</header>

<div class="sections">
  <section class="panel block">
    <h2>{t('settings.section.study')}</h2>
    <div class="field">
      <span>{t('settings.language')}</span>
      <div class="segmented" role="group" aria-label={t('settings.language')}>
        <button aria-pressed={s.language === 'system'} onclick={() => (s.language = 'system')}
          >{t('settings.lang.system')}</button
        >
        <button aria-pressed={s.language === 'en'} onclick={() => (s.language = 'en')}
          >English</button
        >
        <button aria-pressed={s.language === 'nl'} onclick={() => (s.language = 'nl')}
          >Nederlands</button
        >
      </div>
    </div>
    <label class="field">
      <span>{t('settings.newPerDay')} <small class="muted">{t('settings.perDeck')}</small></span>
      <input type="number" min="0" max="200" bind:value={s.newPerDay} />
    </label>
    <label class="field">
      <span>{t('settings.reviewsPerDay')} <small class="muted">{t('settings.perDeck')}</small></span
      >
      <input type="number" min="0" max="2000" bind:value={s.reviewsPerDay} />
    </label>
    <label class="field">
      <span
        >{t('settings.retention')}
        <small class="muted"
          >{t('settings.retentionNote', { count: Math.round(s.retention * 100) })}</small
        ></span
      >
      <input type="range" min="0.8" max="0.95" step="0.01" bind:value={s.retention} />
    </label>
    <div class="field optimise">
      <span>
        {t('settings.personalisedIntervals')}
        <small class="muted">
          {#if s.optimizedAt}
            {t('settings.optimisedOn', {
              date: new Date(s.optimizedAt).toLocaleDateString(dateLocale()),
              count: s.optimizedReviews,
            })}
          {:else if reviews < MIN_REVIEWS}
            {t('settings.optimiseAvailable', { count: MIN_REVIEWS, done: reviews })}
          {:else}
            {t('settings.optimiseFit', { count: reviews })}
          {/if}
        </small>
      </span>
      <span class="reminder">
        <button class="btn small" onclick={optimise} disabled={reviews < MIN_REVIEWS || optimising}>
          {optimising ? t('settings.optimising') : t('settings.optimise')}
        </button>
        {#if s.optimizedAt}
          <button class="btn small ghost" onclick={resetWeights}
            >{t('settings.resetIntervals')}</button
          >
        {/if}
      </span>
    </div>
    <label class="field">
      <span
        >{t('settings.dailyGoal')} <small class="muted">{t('settings.answersPerDay')}</small></span
      >
      <input type="number" min="5" max="500" step="5" bind:value={s.dailyGoal} />
    </label>
    <div class="field">
      <span
        >{t('settings.dailyReminder')}
        <small class="muted">{t('settings.dailyReminderNote')}</small></span
      >
      <span class="reminder">
        <input type="time" bind:value={s.reminderTime} aria-label={t('settings.reminderTime')} />
        <button class="btn small" onclick={downloadReminder}>{t('settings.addToCalendar')}</button>
      </span>
    </div>
    <label class="field">
      <span
        >{t('settings.leechThreshold')} <small class="muted">{t('settings.leechNote')}</small></span
      >
      <input type="number" min="2" max="20" bind:value={s.leechThreshold} />
    </label>
    <fieldset>
      <legend>{t('settings.kanaToLearn')}</legend>
      {#each GROUPS as g (g.id)}
        <label class="switch">
          <span
            >{t(`settings.group.${g.id}` as MessageKey)}
            <span class="muted" lang="ja">{g.example}</span></span
          >
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
      <span>{t('settings.answerStyleLabel')}</span>
      <div class="segmented" role="group" aria-label={t('settings.answerStyleLabel')}>
        <button aria-pressed={s.answerStyle === 'self'} onclick={() => (s.answerStyle = 'self')}
          >{t('settings.answerStyleSelf')}</button
        >
        <button aria-pressed={s.answerStyle === 'typed'} onclick={() => (s.answerStyle = 'typed')}
          >{t('settings.answerStyleTyped')}</button
        >
      </div>
    </div>
    <div class="field">
      <span>{t('settings.romanisationLabel')}</span>
      <div class="segmented" role="group" aria-label={t('settings.romanisationLabel')}>
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
        >{t('settings.introduce')} <small class="muted">{t('settings.introduceNote')}</small></span
      ><input type="checkbox" bind:checked={s.introduce} /></label
    >
    <label class="switch"
      ><span>{t('settings.autoplay')}</span><input
        type="checkbox"
        bind:checked={s.autoplay}
      /></label
    >
    <label class="switch"
      ><span>{t('settings.showOtherScript')}</span><input
        type="checkbox"
        bind:checked={s.showOtherScript}
      /></label
    >
  </section>

  <section class="panel block">
    <h2>{t('settings.section.fonts')}</h2>
    <div class="field">
      <span>{t('settings.cardFont')}</span>
      <div class="segmented" role="group" aria-label={t('settings.fontModeLabel')}>
        <button aria-pressed={s.fontMode === 'fixed'} onclick={() => (s.fontMode = 'fixed')}
          >{t('settings.fontModeFixed')}</button
        >
        <button aria-pressed={s.fontMode === 'random'} onclick={() => (s.fontMode = 'random')}
          >{t('settings.fontModeRandom')}</button
        >
      </div>
    </div>
    <p class="muted small">
      {s.fontMode === 'fixed' ? t('settings.fontDescFixed') : t('settings.fontDescRandom')}
    </p>
    <ul class="fonts">
      {#each fontList as f (f.id)}
        <li class:chosen={s.font === f.id}>
          <button
            class="sample washi turn"
            style={washiStyle(f.id)}
            onclick={() => (s.font = f.id)}
            aria-pressed={s.font === f.id}
            aria-label={t('settings.useAsDefault', { name: f.name })}
          >
            <KanaGlyph text="あア" font={f.id} size="1.9rem" ink={false} />
          </button>
          <span class="name">{f.name}</span>
          <span class="muted tiny"
            >{f.styleLabel}{s.font === f.id ? ` ${t('settings.fontDefault')}` : ''}</span
          >
          {#if s.fontMode === 'random' && !f.isSystem}
            <label class="tiny check">
              <input
                type="checkbox"
                checked={s.randomFonts.includes(f.id)}
                onchange={(e) =>
                  toggleRandomFont(f.id, (e.currentTarget as HTMLInputElement).checked)}
              />
              {t('settings.inRotation')}
            </label>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel block">
    <h2>{t('settings.section.appearance')}</h2>
    <div class="field">
      <span>{t('settings.themeLabel')}</span>
      <div class="segmented" role="group" aria-label={t('settings.themeLabel')}>
        <button aria-pressed={s.theme === 'system'} onclick={() => (s.theme = 'system')}
          >{t('settings.themeSystem')}</button
        >
        <button aria-pressed={s.theme === 'light'} onclick={() => (s.theme = 'light')}
          >{t('settings.themeLight')}</button
        >
        <button aria-pressed={s.theme === 'dark'} onclick={() => (s.theme = 'dark')}
          >{t('settings.themeDark')}</button
        >
      </div>
    </div>
    <label class="switch"
      ><span>{t('settings.photoBackgrounds')}</span><input
        type="checkbox"
        bind:checked={s.photos}
      /></label
    >
    <div class="field">
      <span>{t('settings.changePhoto')}</span>
      <div class="segmented" role="group" aria-label={t('settings.changePhoto')}>
        {#each PHOTO_MODES as m (m.id)}
          <button aria-pressed={s.photoMode === m.id} onclick={() => (s.photoMode = m.id)}
            >{t(`settings.photoMode.${m.id}` as MessageKey)}</button
          >
        {/each}
      </div>
    </div>
    {#if s.photoMode === 'cards'}
      <label class="field">
        <span
          >{t('settings.everyLabel')}
          <small class="muted">{t('settings.everyCardsNote', { count: s.photoEvery })}</small></span
        >
        <input type="range" min="3" max="50" step="1" bind:value={s.photoEvery} />
      </label>
    {:else if s.photoMode === 'minutes'}
      <label class="field">
        <span
          >{t('settings.everyLabel')}
          <small class="muted">{t('settings.everyMinutesNote', { count: s.photoMinutes })}</small
          ></span
        >
        <input type="range" min="1" max="60" step="1" bind:value={s.photoMinutes} />
      </label>
    {/if}
    <label class="switch"
      ><span
        >{t('settings.matchSeason')}
        <small class="muted">{t('settings.matchSeasonNote')}</small></span
      ><input type="checkbox" bind:checked={s.matchSeason} /></label
    >
    <details class="picker">
      <summary>{t('settings.choosePhoto')}</summary>
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
      ><span
        >{t('settings.calmMode')} <small class="muted">{t('settings.calmModeNote')}</small></span
      ><input type="checkbox" bind:checked={s.calm} /></label
    >
    <label class="switch"
      ><span
        >{t('settings.dataSaver')} <small class="muted">{t('settings.dataSaverNote')}</small></span
      ><input type="checkbox" bind:checked={s.dataSaver} /></label
    >
    <div class="field">
      <span>{t('settings.reduceMotionLabel')}</span>
      <div class="segmented" role="group" aria-label={t('settings.reduceMotionLabel')}>
        <button
          aria-pressed={s.reducedMotion === 'system'}
          onclick={() => (s.reducedMotion = 'system')}>{t('settings.reduceMotionSystem')}</button
        >
        <button aria-pressed={s.reducedMotion === 'on'} onclick={() => (s.reducedMotion = 'on')}
          >{t('settings.reduceMotionOn')}</button
        >
        <button aria-pressed={s.reducedMotion === 'off'} onclick={() => (s.reducedMotion = 'off')}
          >{t('settings.reduceMotionOff')}</button
        >
      </div>
    </div>
  </section>

  <section class="panel block">
    <h2>{t('settings.section.sound')}</h2>
    <label class="switch"
      ><span>{t('settings.soundEffects')} <kbd>M</kbd></span><input
        type="checkbox"
        bind:checked={s.sfx}
      /></label
    >
    <label class="field">
      <span
        >{t('settings.effectsVolume')}
        <small class="muted"
          >{t('settings.volumePct', { count: Math.round(s.sfxVolume * 100) })}</small
        ></span
      >
      <input type="range" min="0" max="1" step="0.05" bind:value={s.sfxVolume} disabled={!s.sfx} />
    </label>
    <label class="field">
      <span
        >{t('settings.pronunciationVolume')}
        <small class="muted"
          >{t('settings.volumePct', { count: Math.round(s.voiceVolume * 100) })}</small
        ></span
      >
      <input type="range" min="0" max="1" step="0.05" bind:value={s.voiceVolume} />
    </label>
    <div class="field">
      <span>{t('settings.voiceLabel')} <small class="muted">{t('settings.voiceNote')}</small></span>
      <div class="segmented" role="group" aria-label={t('settings.voiceLabel')}>
        {#each VOICE_OPTIONS as v (v.id)}
          <button aria-pressed={s.voice === v.id} onclick={() => chooseVoice(v.id)}
            >{t(`settings.voice.${v.id}` as MessageKey)}</button
          >
        {/each}
      </div>
    </div>
    <label class="switch"
      ><span>{t('settings.vibrate')} <small class="muted">{t('settings.vibrateNote')}</small></span
      ><input type="checkbox" bind:checked={s.haptics} /></label
    >
    <label class="switch"
      ><span>{t('settings.softClicks')}</span><input
        type="checkbox"
        bind:checked={s.uiTicks}
      /></label
    >
    <label class="switch"
      ><span
        >{t('settings.silentMode')}
        <small class="muted">{t('settings.silentModeNote')}</small></span
      ><input type="checkbox" bind:checked={s.silent} /></label
    >
    <p class="muted small">{t('settings.previewEffects')}</p>
    <div class="row">
      {#each EFFECTS as e (e.id)}
        <button class="btn small" onclick={() => playPreview(e.id)}
          >{t(`settings.sfx.${e.id}` as MessageKey)}</button
        >
      {/each}
    </div>
  </section>

  <section class="panel block">
    <h2>{t('settings.section.yourData')}</h2>
    <p class="muted small">
      {t('settings.dataStored')}{persisted === true ? t('settings.dataPersisted') : ''}{t(
        'settings.dataExportHint',
      )}
    </p>
    <div class="row">
      <button class="btn" onclick={download}>{t('settings.exportProgress')}</button>
      <button class="btn" onclick={() => fileInput?.click()}>{t('settings.importProgress')}</button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onchange={upload}
      />
      {#if confirmReset}
        <button class="btn shu" onclick={reset}>{t('settings.confirmErase')}</button>
        <button class="btn ghost" onclick={() => (confirmReset = false)}
          >{t('settings.cancelReset')}</button
        >
      {:else}
        <button class="btn ghost danger" onclick={() => (confirmReset = true)}
          >{t('settings.resetProgress')}</button
        >
      {/if}
    </div>
  </section>

  <section class="panel block">
    <h2>{t('settings.section.sync')}</h2>
    {#if sync.connected}
      <p class="small">
        {t('settings.syncConnectedDesc')}
        {#if sync.lastSync}{t('settings.lastSynced', {
            date: new Date(sync.lastSync).toLocaleString(dateLocale()),
          })}{/if}
      </p>
      <div class="row">
        <button class="btn" onclick={() => syncNow()} disabled={sync.syncing}>
          {sync.syncing ? t('settings.syncing') : t('settings.syncNow')}
        </button>
        <button class="btn ghost" onclick={() => disconnect()}>{t('settings.disconnect')}</button>
      </div>
    {:else}
      <p class="small">
        {t('settings.syncSetupDesc')}
        <a
          href="https://github.com/settings/tokens/new?scopes=gist&description=kana%20sync"
          target="_blank"
          rel="noopener">{t('settings.syncTokenLink')}</a
        >{t('settings.syncSetupEnd')}
      </p>
      <form
        class="row"
        onsubmit={async (e) => {
          e.preventDefault()
          if (await connect(token)) {
            token = ''
            toast(t('settings.toast.connected'))
          }
        }}
      >
        <input
          type="password"
          bind:value={token}
          placeholder={t('settings.githubToken')}
          aria-label={t('settings.githubToken')}
          autocomplete="off"
        />
        <button class="btn primary" type="submit" disabled={!token.trim() || sync.syncing}>
          {sync.syncing ? t('settings.connecting') : t('settings.connect')}
        </button>
      </form>
    {/if}
    {#if sync.error}<p class="small error" role="alert">
        {t(`settings.syncError.${sync.error}` as MessageKey)}
      </p>{/if}
  </section>

  <section class="panel block">
    <h2>{t('settings.section.install')}</h2>
    {#if standalone}
      <p class="small">{t('settings.installedDesc')}</p>
    {:else if canInstall}
      <p class="small">{t('settings.installAppDesc')}</p>
      <div class="row">
        <button class="btn primary" onclick={install}>{t('settings.installButton')}</button>
      </div>
    {:else}
      <p class="small">{t('settings.installManualDesc')}</p>
    {/if}
  </section>

  <section class="panel block">
    <h2>{t('settings.section.about')}</h2>
    <p class="small">
      {t('settings.aboutBody')}<a href="#/credits">{t('settings.credits')}</a>{t(
        'settings.aboutBodyEnd',
      )}<kbd>?</kbd>{t('settings.aboutShortcutsEnd')}
    </p>
    <p class="small">
      <a href="https://github.com/jeroenjanssens/kana" target="_blank" rel="noopener"
        >{t('settings.githubLink')}</a
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

  .error {
    color: var(--shu);
  }

  .danger {
    color: var(--shu);
  }
</style>
