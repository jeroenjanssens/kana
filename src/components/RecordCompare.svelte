<script lang="ts">
  import '../lib/i18n/speech'
  import { onDestroy } from 'svelte'
  import { recordingSupported, startRecording } from '../lib/audio/recorder'
  import { audio } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /**
   * Record yourself, then hear the app's pronunciation followed by yours (shadowing). Works
   * offline and nothing leaves the device; hidden where the browser can't record.
   */
  let { reference }: { reference: () => Promise<void> } = $props()

  const supported = recordingSupported()
  let phase = $state<'idle' | 'recording' | 'ready' | 'playing'>('idle')
  let clip: Blob | undefined
  let error = $state('')
  let stopRecording: (() => Promise<Blob>) | undefined

  onDestroy(() => void stopRecording?.())

  async function record() {
    error = ''
    try {
      const recording = await startRecording()
      stopRecording = recording.stop
      phase = 'recording'
      clip = await recording.clip
      stopRecording = undefined
      await compare()
    } catch (err) {
      phase = clip ? 'ready' : 'idle'
      error =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? t('record.denied')
          : t('record.failed')
    }
  }

  async function compare() {
    if (!clip) return
    phase = 'playing'
    await reference()
    await new Promise((r) => setTimeout(r, 350))
    await audio.playRecording(clip)
    phase = 'ready'
  }

  async function mine() {
    if (!clip) return
    phase = 'playing'
    await audio.playRecording(clip)
    phase = 'ready'
  }
</script>

{#if supported}
  <div class="record" role="group" aria-label={t('record.label')}>
    {#if phase === 'recording'}
      <button class="btn small rec" onclick={() => stopRecording?.()}>
        <span class="dot" aria-hidden="true"></span>
        {t('record.stop')}
      </button>
    {:else if phase === 'idle'}
      <button class="btn small" onclick={record}>
        <Icon name="mic" size={14} />
        {t('record.start')}
      </button>
    {:else}
      <button class="btn small" disabled={phase === 'playing'} onclick={compare}>
        <Icon name="play" size={14} filled />
        {t('record.compare')}
      </button>
      <button class="btn small ghost" disabled={phase === 'playing'} onclick={mine}
        >{t('record.mine')}</button
      >
      <button class="btn small ghost" disabled={phase === 'playing'} onclick={record}>
        <Icon name="mic" size={14} />
        {t('record.again')}
      </button>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
{/if}

<style>
  .record {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  .rec {
    color: var(--shu);
  }

  .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--shu);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }

  .error {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.85rem;
    color: var(--shu);
  }
</style>
