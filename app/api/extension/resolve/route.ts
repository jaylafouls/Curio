import { resolveLink } from '@/lib/links/actions'
import {
  authenticate,
  jsonResponse,
  preflightResponse,
} from '@/lib/extension/route-helpers'

/**
 * POST /api/extension/resolve — canonicalize a URL into the shared `links` record
 * (Phase 5 chantier 5, action 1 of 3). Thin wrapper over resolveLink: authenticate
 * the bearer token, then delegate with the token-resolved identity. No locale
 * prefix (middleware excludes /api from the next-intl rewrite).
 *
 * Body: { url: string }
 * 200:  { ok: true, linkId, title, description, image, favicon, existing, savesCount }
 * 400:  { ok: false, error: 'invalid_url' | 'invalid' }
 * 401:  { ok: false, error: 'unauthorized' }
 * 500:  { ok: false, error: 'server' }
 */
export const runtime = 'nodejs'

export async function OPTIONS() {
  return preflightResponse()
}

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'invalid' }, 400)
  }

  const url =
    body && typeof body === 'object' && 'url' in body
      ? (body as { url: unknown }).url
      : undefined
  if (typeof url !== 'string' || url.trim().length === 0) {
    return jsonResponse({ ok: false, error: 'invalid' }, 400)
  }

  const result = await resolveLink(url, auth.identity)
  if (!result.ok) {
    const status = result.error === 'invalid_url' ? 400 : 500
    return jsonResponse(result, status)
  }
  return jsonResponse(result, 200)
}
