import { describe, expect, test } from 'vitest'
import { checkVersion, isNewer } from '../../src/lib/ui/version'

const reply = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch

describe('versions', () => {
  test('a later run number is newer; dev never is', () => {
    expect(isNewer('42', '41')).toBe(true)
    expect(isNewer('41', '41')).toBe(false)
    expect(isNewer('40', '41')).toBe(false)
    expect(isNewer('9', '10')).toBe(false)
    expect(isNewer('dev', '41')).toBe(false)
    expect(isNewer('42', 'dev')).toBe(false)
  })

  test('checking the server: newer, latest, or an error', async () => {
    expect(await checkVersion('/', '41', reply({ version: '43' }))).toEqual({
      kind: 'newer',
      version: '43',
    })
    expect(await checkVersion('/', '41', reply({ version: 41 }))).toEqual({ kind: 'latest' })
    expect(await checkVersion('/', '41', reply({}))).toEqual({ kind: 'error' })
    expect(await checkVersion('/', '41', reply({}, false))).toEqual({ kind: 'error' })
    const offline = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    expect(await checkVersion('/', '41', offline)).toEqual({ kind: 'error' })
  })

  test('version.json is fetched without the cache', async () => {
    let seen: [string, RequestInit | undefined] | undefined
    const spy = (async (url: string, init?: RequestInit) => {
      seen = [url, init]
      return { ok: true, json: async () => ({ version: '1' }) }
    }) as unknown as typeof fetch
    await checkVersion('/kana/', '1', spy)
    expect(seen).toEqual(['/kana/version.json', { cache: 'no-store' }])
  })
})
