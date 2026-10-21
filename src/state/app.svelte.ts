import { AudioEngine } from '../lib/audio/engine'
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

    // Remember when the settings last changed, so synced copies keep the newest settings.
    let first = true
    $effect(() => {
      $state.snapshot(store.data.settings)
      if (first) first = false
      else store.data.settingsUpdatedAt = Date.now()
    })

    // Personalised FSRS weights and desired retention apply to every new grade.
    $effect(() => {
      const s = store.data.settings
      const options = { weights: $state.snapshot(s.fsrsWeights), retention: s.retention }
      // Loaded on demand: the Home page doesn't need the FSRS algorithm.
      void import('../lib/srs/scheduler').then((m) => m.configureScheduler(options))
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

  // Unlock audio on every interaction (autoplay policy), not just the first: phones suspend audio
  // when the screen locks or the app goes to the background, and voices that play on a timer
  // can't resume it themselves. On touch screens only pointerup/touchend/click count as a gesture.
  let preloaded = false
  const unlock = () => {
    audio.unlock()
    if (!preloaded) {
      preloaded = true
      void audio.preloadSfx()
    }
  }
  const gestures = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
  for (const type of gestures)
    window.addEventListener(type, unlock, { capture: true, passive: true })

  void requestPersistence()

  return () => {
    stop()
    window.removeEventListener('pagehide', onHide)
    for (const type of gestures) window.removeEventListener(type, unlock, { capture: true })
  }
}
