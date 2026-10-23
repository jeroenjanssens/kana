/**
 * Timers that belong to a view. Delayed sounds and "next card" steps must not run once the view
 * is gone (they would play over the next page), so a view cancels them all when it's destroyed:
 *
 *   const later = timers()
 *   onDestroy(later.cancel)
 */

export type TimerHandle = ReturnType<typeof setTimeout>

export interface Timers {
  /** Run `fn` after `ms`, unless cancelled first. */
  after(ms: number, fn: () => void): TimerHandle | undefined
  /** Resolves after `ms`. It never resolves once cancelled, so the code awaiting it stops there. */
  wait(ms: number): Promise<void>
  /** Cancel one timer. */
  clear(handle: TimerHandle | undefined): void
  /** Cancel every pending timer, and ignore any started later. */
  cancel(): void
}

export function timers(): Timers {
  const pending = new Set<TimerHandle>()
  let cancelled = false
  const after = (ms: number, fn: () => void) => {
    if (cancelled) return undefined
    const handle = setTimeout(() => {
      pending.delete(handle)
      fn()
    }, ms)
    pending.add(handle)
    return handle
  }
  return {
    after,
    wait: (ms) => new Promise((resolve) => void after(ms, resolve)),
    clear(handle) {
      if (handle === undefined) return
      clearTimeout(handle)
      pending.delete(handle)
    },
    cancel() {
      cancelled = true
      for (const handle of pending) clearTimeout(handle)
      pending.clear()
    },
  }
}
