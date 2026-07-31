/**
 * URL canonicalization for the Link model (data model §8: `url_normalized` is the
 * unique canonicalization key; 1 normalized URL = 1 canonical Link).
 *
 * The goal is that two saves of "the same page" — differing only in tracking
 * params, a trailing slash, `www.`, scheme case, or a fragment — collapse to ONE
 * canonical Link so `saves_count` and the "X people saved this" signal are shared
 * (the canonical signal is the base of the monetisation model, §7 / decisions).
 *
 * Deliberately conservative: we only strip things that are known-safe to drop
 * (well-known tracking params, fragments, default ports, trailing slash on a bare
 * path). Query params that could change page identity are preserved and sorted
 * for stability. If a string does not parse as an http(s) URL we return null —
 * the caller treats that as an invalid save target.
 */

/** Tracking / campaign params that never change page identity — safe to drop. */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_cid',
  'utm_reader',
  'utm_referrer',
  'gclid',
  'gclsrc',
  'dclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ig_rid',
  'yclid',
  '_hsenc',
  '_hsmi',
  'vero_id',
  'vero_conv',
  'ref',
  'ref_src',
  'ref_url',
  'referrer',
  'source',
  'spm',
  'scm',
])

/**
 * Normalize a raw URL to its canonical form, or null if it is not a usable
 * http(s) URL. Steps:
 *   1. Trim; add `https://` if the user pasted a scheme-less host.
 *   2. Reject non-http(s) schemes (mailto:, javascript:, data:, ftp:, …).
 *   3. Lowercase host, strip a leading `www.`, drop the default port.
 *   4. Remove tracking params, sort the rest for order-independence.
 *   5. Drop the fragment; strip a trailing slash so "/news/" == "/news" and the
 *      root "/" collapses to "" ("example.com/" == "example.com").
 */
export function normalizeUrl(raw: string): string | null {
  if (typeof raw !== 'string') return null
  let input = raw.trim()
  if (input.length === 0) return null

  // If the string already carries a scheme (`foo:`), keep it as-is so a non-http
  // scheme (mailto:, javascript:, data:, ftp:) is rejected below rather than
  // silently turned into `https://mailto:…`. Only a scheme-LESS host gets https://
  // prepended. A bare "host:port" (digits after the colon) is scheme-less.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:(?![0-9])/.test(input)
  if (!hasScheme) {
    input = `https://${input}`
  }

  let u: URL
  try {
    u = new URL(input)
  } catch {
    return null
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (!u.hostname) return null

  // Host: lowercase (URL already lowercases), strip a single leading www.
  let host = u.hostname.toLowerCase()
  if (host.startsWith('www.')) host = host.slice(4)

  // Port: drop the default for the scheme.
  const port =
    (u.protocol === 'https:' && u.port === '443') ||
    (u.protocol === 'http:' && u.port === '80')
      ? ''
      : u.port

  // Query: drop tracking params, sort the survivors for order-independence.
  const params = new URLSearchParams(u.search)
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) params.delete(key)
  }
  const kept = [...params.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
  const search =
    kept.length > 0
      ? '?' + kept.map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join('&')
      : ''

  // Path: strip a single trailing slash so "/news/" == "/news" (an extremely
  // common variation of the same page) and the bare root "/" collapses to "".
  // A save of "site.com/news" and "site.com/news/" must be ONE canonical Link.
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '')

  const authority = port ? `${host}:${port}` : host
  return `${u.protocol}//${authority}${path}${search}`
}

/**
 * Whether a raw string is a savable http(s) URL (i.e. `normalizeUrl` succeeds).
 * Used for cheap client-side gating of the "Next" button before the round-trip.
 */
export function isSavableUrl(raw: string): boolean {
  return normalizeUrl(raw) !== null
}
