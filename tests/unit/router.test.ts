import { describe, expect, test } from 'vitest'
import { buildHash, parseHash } from '../../src/lib/ui/hash'

describe('parseHash', () => {
  test.each([
    ['', [], {}],
    ['#/', [], {}],
    ['#/table', ['table'], {}],
    ['#/study/hiragana?mode=order&rows=k,s', ['study', 'hiragana'], { mode: 'order', rows: 'k,s' }],
    ['#/reading/%E3%81%AD%E3%81%93', ['reading', 'ねこ'], {}],
  ])('%s', (hash, segments, query) => {
    expect(parseHash(hash)).toEqual({ segments, query })
  })
})

describe('buildHash', () => {
  test('adds a leading slash and drops empty params', () => {
    expect(buildHash('study/katakana', { mode: 'srs', rows: '', x: undefined })).toBe(
      '#/study/katakana?mode=srs',
    )
    expect(buildHash('/')).toBe('#/')
  })
  test('round-trips', () => {
    const hash = buildHash('/study/combined', { mode: 'order', ids: 'a,i,u' })
    expect(parseHash(hash)).toEqual({
      segments: ['study', 'combined'],
      query: { mode: 'order', ids: 'a,i,u' },
    })
  })
})
