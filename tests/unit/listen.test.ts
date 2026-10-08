import { expect, test } from 'vitest'
import { LISTEN_ADVANCE_MS, listenGrade } from '../../src/lib/study/listen'

test('listening grades depend on correctness and speed', () => {
  expect(listenGrade(false, 500)).toBe(1)
  expect(listenGrade(true, 2500)).toBe(4)
  expect(listenGrade(true, 5000)).toBe(3)
  expect(listenGrade(true, 9000)).toBe(2)
})

test('there is time to hear the sound again before the next card', () => {
  expect(LISTEN_ADVANCE_MS).toBeGreaterThanOrEqual(1500)
})
