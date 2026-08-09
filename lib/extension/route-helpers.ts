import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyExtensionToken } from './token'
import type { ExtensionIdentity } from '@/lib/links/actions'

/**
 * Shared plumbing for the /api/extension/* route handlers (Phase 5 chantier 5,
 * Decisions Log §17).
 *
 * TRANSPORT / AUTH MODEL (confirmed with the PO):
 *  - The extension runs on a chrome-extension://<id> origin and CANNOT use the
 *    web session cookie (no cross-origin cookie sharing). It carries a dedicated
 *    bearer token: `Authorization: Bearer <token>`.
 *  - The bearer token is the SOLE auth boundary. There is no cookie/credential
 *    riding along, so there is no CSRF surface, and CORS can be `*` here safely:
 *    the only thing that can call these routes successfully is a holder of a
 *    valid token, which is the token model's concern, not CORS's. We do NOT set
 *    Access-Control-Allow-Credentials, and we do NOT allowlist the (unstable,
 *    changes between dev and published) chrome-extension://<id> origin. This can
 *    be tightened later without touching callers.
 *
 * Every handler: preflight (OPTIONS) → authenticate (Bearer) → do work →
 * jsonResponse (which stamps the CORS headers). Errors are small JSON bodies with
 * the CORS headers so the extension can read them.
 */

/** CORS headers stamped on every extension-route response (incl. errors). */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  // Cache the preflight for a day so the extension isn't re-preflighting every
  // call. Safe: the allowed methods/headers are static.
  'Access-Control-Max-Age': '86400',
}

/** JSON response with the extension CORS headers applied. */
export function jsonResponse(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

/** The standard preflight response — no body, just the CORS headers. */
export function preflightResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** Extract the raw bearer token from an Authorization header, or null. */
function extractBearer(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

/**
 * Authenticate a request from its Authorization header. On success returns an
 * ExtensionIdentity (trusted userId + a fresh service-role client) ready to pass
 * into the wrapped lib functions. On failure returns a 401 JSON response the
 * handler should return as-is.
 *
 * The service-role client is created here (once per request) and shared for the
 * whole handler, so the token verify and the actual work reuse one connection.
 */
export async function authenticate(
  request: Request,
): Promise<
  | { ok: true; identity: ExtensionIdentity }
  | { ok: false; response: NextResponse }
> {
  const raw = extractBearer(request.headers.get('authorization'))
  const userId = await verifyExtensionToken(raw)
  if (!userId) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: 'unauthorized' }, 401),
    }
  }
  return {
    ok: true,
    identity: { userId, client: createAdminClient() },
  }
}
