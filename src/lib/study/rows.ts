import { rowsOf, type Kana, type KanaGroup } from '../data/kana'

export interface RowOption {
  /** `group:row`, e.g. `basic:k`. */
  key: string
  group: KanaGroup
  row: string
  kana: Kana[]
}

/** The table rows that have kana in `pool`, in table order, each with only those kana. */
export function rowOptions(pool: readonly Kana[]): RowOption[] {
  return (['basic', 'dakuten', 'yoon', 'extended'] as KanaGroup[]).flatMap((g) =>
    rowsOf(g)
      .map((r) => ({ ...r, kana: r.kana.filter((k) => pool.includes(k)) }))
      .filter((r) => r.kana.length > 0)
      .map((r) => ({ key: `${g}:${r.row}`, group: g, row: r.row, kana: r.kana })),
  )
}

/** The kana in the selected rows, in table order. */
export function kanaInRows(rows: readonly RowOption[], selected: readonly string[]): Kana[] {
  const keys = new Set(selected)
  return rows.filter((r) => keys.has(r.key)).flatMap((r) => r.kana)
}
