import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { UI_KANJI } from '../../src/lib/data/fonts'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'kanjivg' ? [] : files(path)
    return /\.(svelte|ts)$/.test(name) ? [path] : []
  })
}

test('every kanji used in the UI is included in the font subsets', () => {
  const used = new Set<string>()
  for (const file of files('src')) {
    for (const c of readFileSync(file, 'utf8').match(/[一-鿿]/g) ?? []) used.add(c)
  }
  const missing = [...used].filter((c) => !UI_KANJI.includes(c))
  expect(missing.join('')).toBe('')
})
