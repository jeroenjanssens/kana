export interface Route {
  /** Path segments, e.g. ['study', 'hiragana']. */
  segments: string[]
  query: Record<string, string>
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [path, search = ''] = raw.split('?')
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent)
  const query = Object.fromEntries(new URLSearchParams(search))
  return { segments, query }
}

export function buildHash(path: string, query: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, v)
  const search = params.toString()
  const clean = path.startsWith('/') ? path : `/${path}`
  return `#${clean}${search ? `?${search}` : ''}`
}
