import { getSaveTargets } from '@/lib/links/data'
import {
  authenticate,
  jsonResponse,
  preflightResponse,
} from '@/lib/extension/route-helpers'

/**
 * GET /api/extension/collections — the signed-in user's collections + sections
 * for the extension's save picker (Phase 5 chantier 5, action 2 of 3). Thin
 * wrapper over getSaveTargets: authenticate the bearer token, then read
 * owner-scoped with the token-resolved identity's service-role client (the query
 * scopes by owner_id, so a token only ever reads its own collections).
 *
 * 200: { ok: true, collections: SaveTargetCollection[] }
 * 401: { ok: false, error: 'unauthorized' }
 * 500: { ok: false, error: 'server' }
 */
export const runtime = 'nodejs'

export async function OPTIONS() {
  return preflightResponse()
}

export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const collections = await getSaveTargets(
      auth.identity.userId,
      100,
      auth.identity.client,
    )
    return jsonResponse({ ok: true, collections }, 200)
  } catch (err) {
    console.error('GET /api/extension/collections failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return jsonResponse({ ok: false, error: 'server' }, 500)
  }
}
