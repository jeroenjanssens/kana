import { AudioEngine } from '../lib/audio/engine'
import { configureScheduler } from '../lib/srs/scheduler'
import { load, requestPersistence, save } from '../lib/storage/persistence'
import type { Grade, SaveFile, Settings } from '../lib/storage/schema'
import { haptic } from '../lib/ui/haptics'

/** All persistent state: settings and progress. Mutations are saved automatically. */
export const store = $state<{ data: SaveFile }>({ data: load() })

export const audio = new AudioEngine(import.meta.env.BASE_URL)

/** Answer feedback: the koto note (or wood tock) for the grade, and a light vibration. */
export function feedback(grade: Grade): void {
  void audio.playGrade(grade)
  haptic(grade === 1 ? 'double' : 'tap', {
    enabled: store.data.settings.haptics,
    reducedMotion: document.documentElement.dataset.motion === 'reduce',
  })
}

export function settings(): Settings {
  return store.data.settings
}

/** Replace all data (import/reset). */
export function replaceData(data: SaveFile): void {
  store.data = data
}

function flush() {
  try {
    save($state.snapshot(store.data) as SaveFile)
  } catch (err) {
    console.error('Could not save progress', err)
  }
}

/** Start saving changes, applying audio settings and asking for persistent storage. */
export function startPersistence(): () => void {
  const stop = $effect.root(() => {
    $effect(() => {
      // Reading the snapshot subscribes to every nested change.
      $state.snapshot(store.data)
      const handle = setTimeout(flush, 300)
      return () => clearTimeout(handle)
    })

    // Personalised FSRS weights and desired retention apply to every new grade.
    $effect(() => {
      const s = store.data.settings
      configureScheduler({ weights: $state.snapshot(s.fsrsWeights), retention: s.retention })
    })

    $effect(() => {
      const s = store.data.settings
      audio.configure({
        silent: s.silent,
        sfx: s.sfx,
        sfxVolume: s.sfxVolume,
        voiceVolume: s.voiceVolume,
        uiTicks: s.uiTicks,
        voice: s.voice,
      })
    })
  })

  const onHide = () => flush()
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Unlock audio on the first interaction (autoplay policy) and preload the effects.
  const unlock = () => {
    audio.unlock()
    void audio.preloadSfx()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  void requestPersistence()

  return () => {
    stop()
    window.removeEventListener('pagehide', onHide)
  }
}
