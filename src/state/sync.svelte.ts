import { GistClient, syncWithGist } from '../lib/storage/gist'
import { mergeSaves } from '../lib/storage/merge'
import type { SaveFile } from '../lib/storage/schema'
import { replaceData, store } from './app.svelte'

/** The token and gist id are kept outside the save file, so they're never exported or synced. */
const TOKEN_KEY = 'kana:gist-token'
const GIST_KEY = 'kana:gist-id'
const LAST_KEY = 'kana:last-sync'

export const sync = $state({
  connected: typeof localStorage !== 'undefined' && !!localStorage.getItem(TOKEN_KEY),
  syncing: false,
  lastSync: Number(typeof localStorage !== 'undefined' ? (localStorage.getItem(LAST_KEY) ?? 0) : 0),
  error: '',
})

export async function syncNow(): Promise<boolean> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || sync.syncing) return false
  sync.syncing = true
  sync.error = ''
  try {
    const before = $state.snapshot(store.data) as SaveFile
    const result = await syncWithGist(
      before,
      new GistClient(token),
      localStorage.getItem(GIST_KEY) ?? undefined,
    )
    // Keep anything that changed here while the sync was running.
    replaceData(mergeSaves($state.snapshot(store.data) as SaveFile, result.save))
    localStorage.setItem(GIST_KEY, result.gistId)
    sync.lastSync = Date.now()
    localStorage.setItem(LAST_KEY, String(sync.lastSync))
    return true
  } catch (err) {
    sync.error = (err as Error).message
    return false
  } finally {
    sync.syncing = false
  }
}

export async function connect(token: string): Promise<boolean> {
  localStorage.setItem(TOKEN_KEY, token.trim())
  sync.connected = true
  const ok = await syncNow()
  if (!ok) disconnect(false)
  return ok
}

export function disconnect(clearError = true): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_KEY)
  localStorage.removeItem(LAST_KEY)
  sync.connected = false
  sync.lastSync = 0
  if (clearError) sync.error = ''
}

/** Sync on start, after each study session and when the app goes to the background. */
export function startSync(sessionActive: () => boolean): () => void {
  if (sync.connected) void syncNow()
  let wasActive = false
  const stop = $effect.root(() => {
    $effect(() => {
      const active = sessionActive()
      if (wasActive && !active && sync.connected) void syncNow()
      wasActive = active
    })
  })
  const onHide = () => {
    if (document.visibilityState === 'hidden' && sync.connected) void syncNow()
  }
  document.addEventListener('visibilitychange', onHide)
  return () => {
    stop()
    document.removeEventListener('visibilitychange', onHide)
  }
}
