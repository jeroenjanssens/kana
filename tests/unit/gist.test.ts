import { describe, expect, test } from 'vitest'
import {
  GIST_DESCRIPTION,
  GIST_FILE,
  GistClient,
  SyncError,
  syncWithGist,
} from '../../src/lib/storage/gist'
import { emptySave } from '../../src/lib/storage/schema'
import { recordReview } from '../../src/lib/study/actions'

const T = new Date(2026, 5, 1, 10).getTime()

/** A tiny in-memory fake of the GitHub Gist API. */
function fakeGitHub(options: { token?: string; offline?: boolean } = {}) {
  const gists = new Map<
    string,
    { id: string; description: string; files: Record<string, { content: string }> }
  >()
  const calls: string[] = []
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    if (options.offline) throw new TypeError('Failed to fetch')
    const method = init.method ?? 'GET'
    calls.push(`${method} ${url.replace('https://api.github.com', '')}`)
    const auth = (init.headers as Record<string, string>)?.Authorization
    if (auth !== `Bearer ${options.token ?? 'good'}`) return new Response('', { status: 401 })
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (url.endsWith('/gists?per_page=100')) return json([...gists.values()])
    if (url.endsWith('/gists') && method === 'POST') {
      const body = JSON.parse(init.body as string)
      const id = `g${gists.size + 1}`
      gists.set(id, { id, description: body.description, files: body.files })
      return json(gists.get(id), 201)
    }
    const id = url.split('/').pop()!
    const gist = gists.get(id)
    if (!gist) return new Response('', { status: 404 })
    if (method === 'PATCH') {
      gist.files = { ...gist.files, ...JSON.parse(init.body as string).files }
    }
    return json(gist)
  }) as unknown as typeof fetch
  return { fetcher, gists, calls }
}

describe('Gist sync', () => {
  test('the first sync creates a secret gist with the progress', async () => {
    const gh = fakeGitHub()
    const local = emptySave(1)
    recordReview(local, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: T })
    const { gistId } = await syncWithGist(local, new GistClient('good', gh.fetcher))
    const gist = gh.gists.get(gistId)!
    expect(gist.description).toBe(GIST_DESCRIPTION)
    expect(JSON.parse(gist.files[GIST_FILE].content).cards.hiragana.a).toBeDefined()
    expect(gh.calls).toContain('POST /gists')
  })

  test('two devices end up with both sets of reviews', async () => {
    const gh = fakeGitHub()
    const phone = emptySave(1)
    const laptop = emptySave(2)
    recordReview(phone, { deck: 'hiragana', id: 'a', grade: 3, ms: 1, now: T })
    recordReview(laptop, { deck: 'katakana', id: 'ka', grade: 4, ms: 1, now: T + 1000 })
    const first = await syncWithGist(phone, new GistClient('good', gh.fetcher))
    // The laptop doesn't know the gist id yet: it finds it.
    const second = await syncWithGist(laptop, new GistClient('good', gh.fetcher))
    expect(second.gistId).toBe(first.gistId)
    expect(second.save.log.map((e) => e.id)).toEqual(['a', 'ka'])
    // Back on the phone, using the remembered id.
    const third = await syncWithGist(first.save, new GistClient('good', gh.fetcher), first.gistId)
    expect(Object.keys(third.save.cards)).toEqual(expect.arrayContaining(['hiragana', 'katakana']))
    expect(gh.gists.size).toBe(1)
  })

  test('a bad token or being offline gives a readable error', async () => {
    const bad = fakeGitHub({ token: 'good' })
    await expect(syncWithGist(emptySave(), new GistClient('wrong', bad.fetcher))).rejects.toThrow(
      'GitHub rejected the token',
    )
    const offline = fakeGitHub({ offline: true })
    await expect(
      syncWithGist(emptySave(), new GistClient('good', offline.fetcher)),
    ).rejects.toThrow(SyncError)
  })

  test('a deleted gist is replaced by a new one', async () => {
    const gh = fakeGitHub()
    const { gistId } = await syncWithGist(emptySave(), new GistClient('good', gh.fetcher), 'gone')
    expect(gistId).not.toBe('gone')
    expect(gh.gists.has(gistId)).toBe(true)
  })
})
