import { mergeSaves } from './merge'
import { migrate } from './persistence'
import type { SaveFile } from './schema'

/** Sync progress through a secret GitHub Gist. The token stays in this browser only. */

export const GIST_FILE = 'kana-progress.json'
export const GIST_DESCRIPTION = 'kana — progress (synced by the kana app)'
const API = 'https://api.github.com'

export type SyncErrorCode = 'offline' | 'token' | 'scope' | 'notfound' | 'http'

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code: SyncErrorCode = 'http',
  ) {
    super(message)
  }
}

type Fetch = typeof fetch

interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}

interface Gist {
  id: string
  description: string | null
  files: Record<string, GistFile>
}

export class GistClient {
  constructor(
    private readonly token: string,
    private readonly fetcher: Fetch = (...args) => fetch(...args),
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await this.fetcher(`${API}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      })
    } catch {
      throw new SyncError('Could not reach GitHub — are you offline?', undefined, 'offline')
    }
    if (res.status === 401) throw new SyncError('GitHub rejected the token', 401, 'token')
    if (res.status === 403)
      throw new SyncError('The token is not allowed to use gists', 403, 'scope')
    if (res.status === 404) throw new SyncError('The synced gist was not found', 404, 'notfound')
    if (!res.ok) throw new SyncError(`GitHub returned an error (${res.status})`, res.status)
    return (await res.json()) as T
  }

  /** The id of our gist, if it already exists. */
  async find(): Promise<string | undefined> {
    const gists = await this.request<Gist[]>('/gists?per_page=100')
    return gists.find((g) => GIST_FILE in g.files && g.description === GIST_DESCRIPTION)?.id
  }

  async read(id: string): Promise<SaveFile | undefined> {
    const gist = await this.request<Gist>(`/gists/${id}`)
    const file = gist.files[GIST_FILE]
    if (!file) return undefined
    let content = file.content ?? ''
    if (file.truncated && file.raw_url) {
      const res = await this.fetcher(file.raw_url)
      content = await res.text()
    }
    return content ? migrate(JSON.parse(content)) : undefined
  }

  async create(save: SaveFile): Promise<string> {
    const gist = await this.request<Gist>('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILE]: { content: JSON.stringify(save) } },
      }),
    })
    return gist.id
  }

  async update(id: string, save: SaveFile): Promise<void> {
    await this.request<Gist>(`/gists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(save) } } }),
    })
  }
}

/**
 * Sync once: read the remote copy (finding or creating the gist if needed), merge it with the
 * local progress, and write the result back. Returns the merged progress and the gist id.
 */
export async function syncWithGist(
  local: SaveFile,
  client: GistClient,
  gistId?: string,
): Promise<{ save: SaveFile; gistId: string }> {
  const id = gistId ?? (await client.find())
  if (!id) return { save: local, gistId: await client.create(local) }
  let remote: SaveFile | undefined
  try {
    remote = await client.read(id)
  } catch (err) {
    // The gist was deleted: start a new one with the local progress.
    if (err instanceof SyncError && err.status === 404) {
      return { save: local, gistId: await client.create(local) }
    }
    throw err
  }
  const merged = remote ? mergeSaves(local, remote) : local
  await client.update(id, merged)
  return { save: merged, gistId: id }
}
