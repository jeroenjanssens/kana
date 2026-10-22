/** Service worker registration and the "install app" prompt. */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | undefined
const listeners = new Set<(available: boolean) => void>()

export function onInstallAvailable(fn: (available: boolean) => void): () => void {
  listeners.add(fn)
  fn(deferred !== undefined)
  return () => listeners.delete(fn)
}

export async function install(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = undefined
  listeners.forEach((fn) => fn(false))
  return outcome === 'accepted'
}

export function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export async function registerPwa(handlers: {
  onNeedRefresh: (update: () => void) => void
  onOfflineReady: () => void
}) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn(true))
  })
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  const { registerSW } = await import('virtual:pwa-register')
  const update = (updateSW = registerSW({
    onNeedRefresh: () => {
      // Asked for (by clicking the version): switch right away instead of offering it.
      if (installNow) void update(true)
      else handlers.onNeedRefresh(() => void update(true))
    },
    onOfflineReady: handlers.onOfflineReady,
    onRegisteredSW: (_url, r) => (registration = r),
  }))
}

let registration: ServiceWorkerRegistration | undefined
let updateSW: ((reload?: boolean) => Promise<void>) | undefined
let installNow = false

/**
 * Install the newest version and reload. The service worker fetches it and the page reloads once
 * it's ready; without a service worker (or if that takes too long), simply reload.
 */
export async function installUpdate(): Promise<void> {
  installNow = true
  setTimeout(() => location.reload(), 10_000)
  if (!registration) return location.reload()
  // Already downloaded (the "new version" message was shown): just switch.
  if (registration.waiting && updateSW) return updateSW(true)
  try {
    await registration.update()
  } catch {
    location.reload()
  }
}
