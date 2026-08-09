import { saveLink, type SaveLinkInput } from '@/lib/links/actions'
import {
  authenticate,
  jsonResponse,
  preflightResponse,
} from '@/lib/extension/route-helpers'

/**
 * POST /api/extension/save — persist the user's personal save of an already-
 * resolved canonical Link (Phase 5 chantier 5, action 3 of 3). Thin wrapper over
 * saveLink: authenticate the bearer token, then delegate with the token-resolved
 * identity (service-role client; user_id is set from the trusted token, not the
 * body). Ownership of the target collection/section is enforced inside saveLink.
 *
 * Body: { linkId, urlOrigin, collectionId?, sectionId?, titleOverride?, note?,
 *         tags?, customImageUrl? }
 * 200:  { ok: true, userLinkId, collectionSlug, collectionName }
 * 400:  { ok: false, error: 'invalid' }
 * 401:  { ok: false, error: 'unauthorized' }
 * 404:  { ok: false, error: 'not_found' }  (collection not owned / missing)
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
  if (!body || typeof body !== 'object') {
    return jsonResponse({ ok: false, error: 'invalid' }, 400)
  }

  const b = body as Record<string, unknown>
  // saveLink re-validates everything server-side (linkId presence, url_origin,
  // ownership, caps); we only shape the input here. The user_id is NEVER taken
  // from the body — it comes from the token via auth.identity.
  const input: SaveLinkInput = {
    linkId: typeof b.linkId === 'string' ? b.linkId : '',
    urlOrigin: typeof b.urlOrigin === 'string' ? b.urlOrigin : '',
    collectionId: typeof b.collectionId === 'string' ? b.collectionId : null,
    sectionId: typeof b.sectionId === 'string' ? b.sectionId : null,
    titleOverride:
      typeof b.titleOverride === 'string' ? b.titleOverride : null,
    note: typeof b.note === 'string' ? b.note : null,
    tags: Array.isArray(b.tags) ? (b.tags as string[]) : null,
    customImageUrl:
      typeof b.customImageUrl === 'string' ? b.customImageUrl : null,
  }

  const result = await saveLink(input, auth.identity)
  if (!result.ok) {
    const status =
      result.error === 'invalid'
        ? 400
        : result.error === 'not_found'
          ? 404
          : 500
    return jsonResponse(result, status)
  }
  return jsonResponse(result, 200)
}
