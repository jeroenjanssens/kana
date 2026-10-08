import { expect, test, vi } from 'vitest'
import { haptic } from '../../src/lib/ui/haptics'

test('vibrates with a short tap or a double tap', () => {
  const vibrate = vi.fn(() => true)
  expect(haptic('tap', { enabled: true, reducedMotion: false }, { vibrate })).toBe(true)
  haptic('double', { enabled: true, reducedMotion: false }, { vibrate })
  expect(vibrate.mock.calls).toEqual([[[12]], [[12, 60, 12]]])
})

test('does nothing when off, with reduced motion, or without support', () => {
  const vibrate = vi.fn(() => true)
  expect(haptic('tap', { enabled: false, reducedMotion: false }, { vibrate })).toBe(false)
  expect(haptic('tap', { enabled: true, reducedMotion: true }, { vibrate })).toBe(false)
  expect(haptic('tap', { enabled: true, reducedMotion: false }, {})).toBe(false)
  expect(vibrate).not.toHaveBeenCalled()
})
