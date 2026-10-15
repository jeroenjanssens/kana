import { describe, expect, test } from 'vitest'
import { kanaById, kanaInGroups } from '../../src/lib/data/kana'
import { kanaInRows, rowOptions } from '../../src/lib/study/rows'

describe('row options', () => {
  test('lists the rows of the pool in table order, with only the kana in the pool', () => {
    const pool = ['ka', 'ki', 'a', 'ga'].map(kanaById)
    const rows = rowOptions(pool)
    expect(rows.map((r) => r.key)).toEqual(['basic:a', 'basic:k', 'dakuten:g'])
    expect(rows[1].kana.map((k) => k.id)).toEqual(['ka', 'ki'])
  })

  test('kanaInRows keeps table order whatever the selection order', () => {
    const rows = rowOptions(kanaInGroups(['basic']))
    const ids = kanaInRows(rows, ['basic:k', 'basic:a']).map((k) => k.id)
    expect(ids).toEqual(['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'])
  })
})
