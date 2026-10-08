import { parseHash, buildHash, type Route } from '../lib/ui/hash'

export { parseHash, buildHash, type Route }

export const route = $state<Route>(parseHash(typeof location === 'undefined' ? '' : location.hash))

export function startRouter(): () => void {
  const update = () => {
    const next = parseHash(location.hash)
    route.segments = next.segments
    route.query = next.query
  }
  window.addEventListener('hashchange', update)
  return () => window.removeEventListener('hashchange', update)
}

export function navigate(path: string, query?: Record<string, string | undefined>): void {
  location.hash = buildHash(path, query)
}
