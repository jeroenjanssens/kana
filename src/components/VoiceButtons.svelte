<script lang="ts">
  import type { VoiceId } from '../lib/audio/voices'
  import { settings } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /** Play buttons for both voices, the chosen one first. */
  let { play, label }: { play: (voice: VoiceId) => void; label: string } = $props()

  const voices = $derived<VoiceId[]>(
    settings().voice === 'male' ? ['male', 'female'] : ['female', 'male'],
  )
</script>

<span class="voices">
  {#each voices as v (v)}
    <button
      class="btn small"
      onclick={() => play(v)}
      aria-label="{label} · {t(`settings.voice.${v}`)}"
      title={t(`settings.voice.${v}`)}
    >
      <Icon name="speaker" size={14} />
      {t(`settings.voice.${v}`)}
    </button>
  {/each}
</span>

<style>
  .voices {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
</style>
