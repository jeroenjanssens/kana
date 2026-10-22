/** The version of the running app: the GitHub Actions run number that built it, or "dev". */
export const APP_VERSION: string = __APP_VERSION__

export type UpdateCheck =
  { kind: 'newer'; version: string } | { kind: 'latest' } | { kind: 'error' }

/** True when `remote` is a later version than `local` (both run numbers; "dev" is never later). */
export function isNewer(remote: string, local: string): boolean {
  const r = Number(remote)
  const l = Number(local)
  return Number.isInteger(r) && Number.isInteger(l) && r > l
}

/** Ask the server which version is out (version.json is never cached). */
export async function checkVersion(
  base: string,
  local = APP_VERSION,
  fetcher: typeof fetch = (...args) => fetch(...args),
): Promise<UpdateCheck> {
  try {
    const res = await fetcher(`${base}version.json`, { cache: 'no-store' })
    if (!res.ok) return { kind: 'error' }
    const { version } = (await res.json()) as { version?: unknown }
    if (typeof version !== 'string' && typeof version !== 'number') return { kind: 'error' }
    return isNewer(String(version), local)
      ? { kind: 'newer', version: String(version) }
      : { kind: 'latest' }
  } catch {
    return { kind: 'error' }
  }
}
