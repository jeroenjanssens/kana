import { flushSync } from 'svelte'
import { afterEach, expect, test, vi } from 'vitest'

// Node's own (unconfigured) localStorage shadows jsdom's, so the app state gets a simple one.
vi.hoisted(() => {
  const items = new Map<string, string>()
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
})

const { settings, startPersistence, store } = await import('../../src/state/app.svelte')

let stop: (() => void) | undefined
afterEach(() => stop?.())

/** Runs a change and its effects, and says whether it counted as a settings change. */
function touches(change: () => void): boolean {
  store.data.settingsUpdatedAt = 0
  change()
  flushSync()
  return store.data.settingsUpdatedAt !== 0
}

test('the photo the app rotates to by itself is not a settings change', () => {
  stop = startPersistence()
  flushSync()
  settings().photoMode = 'cards'
  flushSync()
  expect(touches(() => (settings().photoSlug = 'nara-deer'))).toBe(false)
  expect(touches(() => (settings().photoDay = '2026-10-23'))).toBe(false)
  expect(touches(() => (settings().theme = 'dark'))).toBe(true)
  // In 'fixed' mode the photo is one someone picked.
  settings().photoMode = 'fixed'
  flushSync()
  expect(touches(() => (settings().photoSlug = 'gion-lanterns'))).toBe(true)
})
