<script lang="ts">
  import '../lib/i18n/speech'
  import { onDestroy } from 'svelte'
  import { captureSupported } from '../lib/speech/capture'
  import { ListenError, listenForKana, type ListenErrorCode } from '../lib/speech/listen'
  import type { KanaResult } from '../lib/speech/recognize'
  import type { MessageKey } from '../lib/i18n/messages'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /**
   * A microphone button for the offline kana model: tap, say a kana, and it stops by itself when
   * you're done. The model is downloaded on the first tap.
   */
  let {
    label,
    disabled = false,
    onresult,
  }: { label: string; disabled?: boolean; onresult: (result: KanaResult) => void } = $props()

  const supported = captureSupported()
  let phase = $state<'idle' | 'listening' | 'thinking'>('idle')
  let level = $state(0)
  let error = $state<ListenErrorCode | undefined>()
  let stop: (() => void) | undefined

  onDestroy(() => stop?.())

  const ERROR_KEY: Record<ListenErrorCode, MessageKey> = {
    denied: 'say.error.denied',
    microphone: 'say.error.microphone',
    model: 'say.error.model',
  }

  async function tap() {
    if (phase === 'listening') return stop?.()
    if (phase !== 'idle') return
    error = undefined
    phase = 'listening'
    const session = listenForKana({ onLevel: (l) => (level = l) })
    stop = () => {
      session.stop()
      phase = 'thinking'
    }
    try {
      const result = await session.result
      onresult(result)
    } catch (err) {
      error = err instanceof ListenError ? err.code : 'microphone'
    } finally {
      phase = 'idle'
      level = 0
      stop = undefined
    }
  }

  /** Start listening, e.g. from a keyboard shortcut. */
  export function start() {
    if (phase === 'idle' && !disabled) void tap()
  }
</script>

{#if supported}
  <div class="say">
    <button
      class="btn primary mic"
      class:listening={phase === 'listening'}
      disabled={disabled || phase === 'thinking'}
      onclick={tap}
      style:--level={level}
    >
      <Icon name={phase === 'listening' ? 'stop' : 'mic'} size={18} />
      {phase === 'listening'
        ? t('say.listening')
        : phase === 'thinking'
          ? t('say.thinking')
          : label}
    </button>
    {#if error}<p class="error" role="alert">{t(ERROR_KEY[error])}</p>{/if}
  </div>
{:else}
  <p class="muted">{t('say.unsupported')}</p>
{/if}

<style>
  .say {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .mic {
    min-height: 52px;
    padding-inline: 1.4rem;
    font-size: 1.05rem;
  }

  .mic.listening {
    background: var(--shu);
    border-color: var(--shu);
    box-shadow: 0 0 0 calc(var(--level) * 14px) color-mix(in srgb, var(--shu) 30%, transparent);
    transition: box-shadow 0.06s linear;
  }

  .error {
    margin: 0;
    max-width: 40ch;
    text-align: center;
    color: var(--shu);
  }
</style>
