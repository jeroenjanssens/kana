import { describe, expect, test } from 'vitest'
import {
  drawingIds,
  hasDrawing,
  loadDrawing,
  showDrawing,
  toggleDrawing,
} from '../../src/lib/data/drawings'
import { KANA, kanaById } from '../../src/lib/data/kana'

const BASIC = KANA.filter((k) => k.group === 'basic').map((k) => k.id)
const SCRIPTS = ['hiragana', 'katakana'] as const

describe('memory-hint drawings', () => {
  test.each(SCRIPTS)('every basic kana has a %s drawing, and nothing else', (script) => {
    expect(drawingIds(script).sort()).toEqual([...BASIC].sort())
    expect(drawingIds(script)).toHaveLength(46)
  })

  test('only basic kana have one', () => {
    expect(hasDrawing(kanaById('ka'), 'hiragana')).toBe(true)
    expect(hasDrawing(kanaById('ka'), 'katakana')).toBe(true)
    expect(hasDrawing(kanaById('ga'), 'hiragana')).toBe(false)
    expect(hasDrawing(kanaById('kya'), 'katakana')).toBe(false)
    expect(hasDrawing(kanaById('x-fa'), 'katakana')).toBe(false)
  })

  test.each(SCRIPTS.flatMap((script) => BASIC.map((id) => [script, id] as const)))(
    '%s %s has an em box and three layers',
    async (script, id) => {
      const d = await loadDrawing(id, script)
      expect(d).toBeDefined()
      const box = d!.viewBox.split(' ').map(Number)
      expect(box).toHaveLength(4)
      expect(box[2]).toBe(box[3])
      for (const layer of [d!.paper, d!.tint, d!.ink]) expect(layer).toMatch(/^M/)
    },
  )

  test('the scripts have different drawings', async () => {
    expect((await loadDrawing('ka', 'hiragana'))!.ink).not.toBe(
      (await loadDrawing('ka', 'katakana'))!.ink,
    )
  })

  test('which sides show the drawing', () => {
    expect(showDrawing('off', 'back')).toBe(false)
    expect(showDrawing('back', 'front')).toBe(false)
    expect(showDrawing('back', 'back')).toBe(true)
    expect(showDrawing('always', 'front')).toBe(true)
  })

  test('toggling flips the side in view and changes the mode as little as possible', () => {
    expect(toggleDrawing('back', 'back')).toBe('off')
    expect(toggleDrawing('off', 'back')).toBe('back')
    expect(toggleDrawing('always', 'back')).toBe('off')
    expect(toggleDrawing('back', 'front')).toBe('always')
    expect(toggleDrawing('off', 'front')).toBe('always')
    expect(toggleDrawing('always', 'front')).toBe('back')
    for (const mode of ['off', 'back', 'always'] as const) {
      for (const side of ['front', 'back'] as const) {
        expect(showDrawing(toggleDrawing(mode, side), side)).toBe(!showDrawing(mode, side))
      }
    }
  })
})
