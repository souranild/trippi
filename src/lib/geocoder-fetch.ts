import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Only these hosts may be requested (prevents open proxy if a URL is ever mishandled). */
const ALLOWED_HOSTS = new Set(['photon.komoot.io', 'nominatim.openstreetmap.org'])

function assertAllowedGeocoderUrl(urlStr: string): URL {
  const u = new URL(urlStr)
  if (u.protocol !== 'https:') throw new Error('only https')
  if (!ALLOWED_HOSTS.has(u.hostname)) throw new Error('host not allowed')
  return u
}

/**
 * Node's fetch() can fail TLS verification while the system `curl` CLI succeeds
 * (different CA store / SSL inspection). Retry with curl using the same URL and headers.
 */
export async function fetchGeocoderJson(
  urlStr: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const url = assertAllowedGeocoderUrl(urlStr)
  const href = url.href

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(href, {
      headers,
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    clearTimeout(t)
    const args = ['-sS', '--max-time', String(Math.ceil(timeoutMs / 1000))]
    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`)
    }
    args.push(href)
    const { stdout } = await execFileAsync('curl', args, {
      maxBuffer: 6 * 1024 * 1024,
    })
    return JSON.parse(stdout) as unknown
  }
}
