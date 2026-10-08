<script lang="ts">
  import { audio, settings } from '../state/app.svelte'
  import Icon from './Icon.svelte'

  let open = $state(false)
  const s = $derived(settings())
  const muted = $derived(s.silent || !s.sfx)

  function toggle() {
    if (s.silent) {
      s.silent = false
      s.sfx = true
    } else {
      s.sfx = !s.sfx
    }
    if (s.sfx) void audio.playSfx('tick', { gain: 2 })
  }
</script>

<div class="sound">
  <button
    class="btn icon ghost"
    onclick={toggle}
    aria-label={muted ? 'Unmute sound effects (M)' : 'Mute sound effects (M)'}
    title={muted ? 'Unmute sound effects (M)' : 'Mute sound effects (M)'}
  >
    <Icon name={muted ? 'mute' : 'speaker'} />
  </button>
  <button
    class="btn icon ghost more"
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-label="Volume settings"
    title="Volume"
  >
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
      ><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg
    >
  </button>
  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={() => (open = false)} onkeydown={() => {}}></div>
    <div class="popover panel" role="dialog" aria-label="Sound settings">
      <label class="switch">
        <span>Sound effects</span>
        <input type="checkbox" bind:checked={s.sfx} />
      </label>
      <label class="slider">
        <span>Effects volume <span class="muted">{Math.round(s.sfxVolume * 100)}%</span></span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          bind:value={s.sfxVolume}
          disabled={!s.sfx}
        />
      </label>
      <label class="slider">
        <span
          >Pronunciation volume <span class="muted">{Math.round(s.voiceVolume * 100)}%</span></span
        >
        <input type="range" min="0" max="1" step="0.05" bind:value={s.voiceVolume} />
      </label>
      <label class="switch">
        <span>Silent mode <span class="muted small">mutes everything</span></span>
        <input type="checkbox" bind:checked={s.silent} />
      </label>
    </div>
  {/if}
</div>

<style>
  .sound {
    position: relative;
    display: flex;
    align-items: center;
  }

  .more {
    width: 22px;
    margin-left: -10px;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .popover {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 41;
    width: 280px;
    padding: 0.9rem 1.1rem;
    background: var(--panel-strong);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .slider {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.3rem 0;
  }

  .slider span {
    display: flex;
    justify-content: space-between;
  }

  .small {
    font-size: 0.75rem;
    display: block;
  }
</style>
