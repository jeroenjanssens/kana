import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { timers } from '../../src/lib/ui/timers'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('runs a timer after its delay', () => {
  const later = timers()
  const fn = vi.fn()
  later.after(300, fn)
  vi.advanceTimersByTime(299)
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(fn).toHaveBeenCalledOnce()
})

test('one timer can be cleared', () => {
  const later = timers()
  const kept = vi.fn()
  const cleared = vi.fn()
  later.after(100, kept)
  later.clear(later.after(100, cleared))
  later.clear(undefined)
  vi.advanceTimersByTime(100)
  expect(kept).toHaveBeenCalledOnce()
  expect(cleared).not.toHaveBeenCalled()
})

test('cancelling stops pending timers and ignores new ones', () => {
  const later = timers()
  const fn = vi.fn()
  later.after(100, fn)
  later.cancel()
  expect(later.after(10, fn)).toBeUndefined()
  vi.advanceTimersByTime(1000)
  expect(fn).not.toHaveBeenCalled()
})

test('code awaiting a wait stops when cancelled', async () => {
  const later = timers()
  const steps: string[] = []
  const run = async () => {
    await later.wait(100)
    steps.push('first')
    await later.wait(100)
    steps.push('second')
  }
  void run()
  await vi.advanceTimersByTimeAsync(100)
  later.cancel()
  await vi.advanceTimersByTimeAsync(1000)
  expect(steps).toEqual(['first'])
})
