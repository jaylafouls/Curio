import 'server-only'

/**
 * Best-effort Open Graph metadata fetch for a URL being saved (ADD_ITEM_FLOW
 * §2.2 step 3 / §3.2 step 3). Server-side only — the browser never fetches the
 * target site directly (CORS would block it and it would leak the user's IP to
 * arbitrary hosts). No third-party unfurl service (project non-negotiable: no
 * dependency that sets a non-essential cookie / sends data to an external party);
 * we fetch the page ourselves and parse the <meta> tags.
 *
 * "Best-effort" is load-bearing: if the fetch fails, times out, is blocked, or
 * returns non-HTML, we DO NOT fail the save — the caller falls back to
 * `{ title: <the URL>, description: null, image: null }`. A save must never be
 * blocked by a slow or hostile target site.
 *
 * SSRF note: this runs only for a canonical Link that does not yet exist (the
 * dedup path skips the fetch entirely), and only for http(s) URLs that already
 * passed normalization. We block obvious internal targets (localhost, private
 * ranges by hostname) as a cheap guard; a full SSRF allowlist is out of scope for
 * V1 but the entry point is centralised here so it can be hardened in one place.
 */

export type OgMetadata = {
  title: string | null
  description: string | null
  image: string | null
  /** Absolute http(s) favicon URL, best-effort (may be the /favicon.ico guess). */
  favicon: string | null
}

const FETCH_TIMEOUT_MS = 6000
const MAX_BYTES = 512 * 1024 // read at most 512 KiB of HTML — <head> is early

/** Reject obviously-internal hosts (loopback, link-local, RFC1918) by name. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === '0.0.0.0' || h === '::1' || h === '[::1]') return true
  if (h === '127.0.0.1' || h.startsWith('127.')) return true
  if (h.startsWith('10.') || h.startsWith('192.168.')) return true
  // 172.16.0.0 – 172.31.255.255
  const m = h.match(/^172\.(\d{1,3})\./)
  if (m) {
    const second = Number(m[1])
    if (second >= 16 && second <= 31) return true
  }
  if (h.startsWith('169.254.')) return true // link-local
  return false
}

/** Decode the handful of HTML entities that appear in title/description text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Extract a meta value by property/name from a chunk of HTML. Matches both
 * attribute orders (`property` before or after `content`) since sites vary.
 */
function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // property="og:title" ... content="..."   OR   content="..." ... property="og:title"
    const a = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
      'i',
    )
    const b = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
      'i',
    )
    const match = html.match(a) ?? html.match(b)
    if (match?.[1]) {
      const value = decodeEntities(match[1]).trim()
      if (value) return value
    }
  }
  return null
}

/** Plain <title> as a last-resort title source. */
function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m?.[1]) return null
  const value = decodeEntities(m[1]).replace(/\s+/g, ' ').trim()
  return value || null
}

/**
 * Best-effort favicon URL. Scans every <link> tag in <head> whose rel names an
 * icon, then prefers a real declared icon over apple-touch-icon; falls back to
 * the well-known <origin>/favicon.ico when the markup declares none. The href is
 * resolved absolute against the page URL (handles protocol- and path-relative);
 * only an http(s) result is trusted. Returns null only if even the resolve of
 * the /favicon.ico guess fails (never for a normal http(s) page).
 */
export function faviconUrl(html: string, base: URL): string | null {
  // Grab each <link ...> tag, then read its rel + href regardless of attr order.
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  let declaredIcon: string | null = null
  let appleIcon: string | null = null

  for (const tag of links) {
    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1]?.toLowerCase()
    if (!rel || !rel.includes('icon')) continue
    const href = tag.match(/\bhref=["']([^"']*)["']/i)?.[1]
    if (!href) continue
    if (rel.includes('apple-touch-icon')) {
      appleIcon ??= href
    } else {
      // "icon", "shortcut icon", "mask-icon", "fluid-icon" — a real declared icon.
      declaredIcon ??= href
    }
  }

  // Resolve candidates in priority order, taking the first that yields a trusted
  // http(s) URL. A declared-but-untrusted icon (e.g. a data: URI) must NOT shadow
  // the /favicon.ico fallback, so we try the next candidate rather than bail.
  for (const candidate of [declaredIcon, appleIcon, '/favicon.ico']) {
    if (!candidate) continue
    try {
      const resolved = new URL(candidate, base)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return resolved.toString()
      }
    } catch {
      // Unparseable href — skip to the next candidate.
    }
  }
  return null
}

/**
 * Fetch and parse OG metadata for `url`. Always resolves (never throws) — on any
 * failure it returns all-null so the caller uses its URL fallback. Only ever
 * called for a brand-new canonical Link (existing Links reuse stored metadata).
 */
export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  const empty: OgMetadata = {
    title: null,
    description: null,
    image: null,
    favicon: null,
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return empty
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return empty
  if (isBlockedHost(parsed.hostname)) {
    console.warn('fetchOgMetadata: blocked internal host', {
      host: parsed.hostname,
    })
    return empty
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // A real UA + HTML accept — some sites 403 an empty UA.
        'user-agent':
          'Mozilla/5.0 (compatible; CurioBot/1.0; +https://curio.example)',
        accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      console.warn('fetchOgMetadata: non-ok response', {
        url,
        status: res.status,
      })
      return empty
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) return empty

    // Read at most MAX_BYTES of the body — <head> metadata is near the top, so we
    // don't need (or want) a whole large page in memory.
    const reader = res.body?.getReader()
    if (!reader) {
      const text = await res.text()
      return parseOg(text.slice(0, MAX_BYTES), parsed)
    }
    const decoder = new TextDecoder()
    let html = ''
    let received = 0
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      html += decoder.decode(value, { stream: true })
      // Stop early once we've clearly passed </head>.
      if (/<\/head>/i.test(html)) break
    }
    await reader.cancel().catch(() => {})
    return parseOg(html, parsed)
  } catch (err) {
    // Timeout (abort), DNS failure, TLS error, connection refused — all normal
    // for a best-effort fetch. Log and fall back.
    console.warn('fetchOgMetadata: fetch failed', {
      url,
      message: err instanceof Error ? err.message : String(err),
    })
    return empty
  } finally {
    clearTimeout(timer)
  }
}

/** Parse the collected HTML into OG fields; resolve a relative image to absolute. */
function parseOg(html: string, base: URL): OgMetadata {
  const title =
    metaContent(html, ['og:title', 'twitter:title']) ?? titleTag(html)
  const description = metaContent(html, [
    'og:description',
    'twitter:description',
    'description',
  ])
  let image = metaContent(html, [
    'og:image:secure_url',
    'og:image',
    'twitter:image',
    'twitter:image:src',
  ])
  if (image) {
    try {
      // Resolve protocol-relative ("//host/x") and path-relative image URLs.
      image = new URL(image, base).toString()
    } catch {
      image = null
    }
  }
  const favicon = faviconUrl(html, base)
  return { title, description, image, favicon }
}
