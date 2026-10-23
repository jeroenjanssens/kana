import { describe, expect, test, vi } from 'vitest'
import { WASHI_VARIANTS, generateWashi, installWashi, washiStyle } from '../../src/lib/ui/washi'

describe('generateWashi', () => {
  test('gives no sheet when canvas is unavailable (jsdom)', async () => {
    await expect(generateWashi()).resolves.toBeUndefined()
  })
})

describe('installWashi', () => {
  let urls = 0
  const revoked: string[] = []
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => `blob:sheet-${urls++}`,
    revokeObjectURL: (url: string) => revoked.push(url),
  })

  /** Runs idle callbacks straight away, and waits for the sheets to be set. */
  async function install(
    root: HTMLElement,
    dark: boolean,
    generate = async (): Promise<Blob | undefined> => new Blob(),
  ) {
    const pending: Promise<void>[] = []
    const cancel = installWashi(root, dark, {
      idle: (fn) => pending.push(fn()),
      generate,
    })
    await Promise.all(pending)
    return cancel
  }

  test('sets every sheet as a short blob: URL, never as a data: URL', async () => {
    const root = document.createElement('div')
    await install(root, false)
    for (let i = 0; i < WASHI_VARIANTS.length; i++) {
      expect(root.style.getPropertyValue(`--washi-${i}`)).toMatch(/^url\(blob:sheet-\d+\)$/)
    }
  })

  test('draws the sheets for the theme', async () => {
    const generate = vi.fn(async () => new Blob())
    await install(document.createElement('div'), true, generate)
    expect(generate).toHaveBeenCalledTimes(WASHI_VARIANTS.length)
    for (const [options] of generate.mock.calls as unknown as [{ dark: boolean }][])
      expect(options.dark).toBe(true)
  })

  test('revokes a sheet when it is replaced, not before', async () => {
    const root = document.createElement('div')
    await install(root, false)
    const first = root.style.getPropertyValue('--washi-0').slice(4, -1)
    const before = revoked.length
    await install(root, true)
    expect(revoked.slice(before)).toContain(first)
    expect(revoked).not.toContain(root.style.getPropertyValue('--washi-0').slice(4, -1))
  })

  test('a cancelled install leaves the current sheets alone', async () => {
    const root = document.createElement('div')
    await install(root, false)
    const current = root.style.getPropertyValue('--washi-1')
    const callbacks: (() => Promise<void>)[] = []
    const cancel = installWashi(root, true, { idle: (fn) => callbacks.push(fn) })
    cancel()
    await Promise.all(callbacks.map((fn) => fn()))
    expect(root.style.getPropertyValue('--washi-1')).toBe(current)
  })

  test('without a canvas the sheets are plain paper', async () => {
    const root = document.createElement('div')
    await install(root, false, async () => undefined)
    expect(root.style.getPropertyValue('--washi-2')).toBe('none')
  })
})

describe('washiStyle', () => {
  const parse = (style: string) =>
    Object.fromEntries(style.split(';').map((d) => d.split(':').map((x) => x.trim())))

  test('is deterministic for the same seed', () => {
    expect(washiStyle('ka')).toBe(washiStyle('ka'))
    expect(washiStyle(5)).toBe(washiStyle(5))
  })

  test('picks one of the textures, an angle and an offset', () => {
    for (const seed of ['a', 'shi', 'kya', 1, 2, 3]) {
      const v = parse(washiStyle(seed))
      expect(v['--washi-tex']).toMatch(
        new RegExp(`^var\\(--washi-[0-${WASHI_VARIANTS.length - 1}]\\)$`),
      )
      const angle = parseInt(v['--washi-angle'])
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThanOrEqual(360)
      expect(parseInt(v['--washi-x'])).toBeLessThanOrEqual(384)
    }
  })

  test('different seeds give different paper', () => {
    const styles = new Set(['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku'].map(washiStyle))
    expect(styles.size).toBe(8)
    const textures = new Set(
      Array.from({ length: 40 }, (_, i) => parse(washiStyle(i))['--washi-tex']),
    )
    expect(textures.size).toBe(WASHI_VARIANTS.length)
  })
})

test('the paper variants differ', () => {
  expect(new Set(WASHI_VARIANTS.map((v) => JSON.stringify(v))).size).toBe(WASHI_VARIANTS.length)
})
