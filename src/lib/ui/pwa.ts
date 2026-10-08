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
  const update = registerSW({
    onNeedRefresh: () => handlers.onNeedRefresh(() => void update(true)),
    onOfflineReady: handlers.onOfflineReady,
  })
}
