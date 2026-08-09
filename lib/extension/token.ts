import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Chrome-extension bearer tokens (Phase 5, chantier 5 — Decisions Log §17).
 *
 * The extension authenticates with a dedicated token, NOT the web session
 * cookie (no cross-origin cookie sharing). This module is the single source of
 * truth for minting, verifying, and revoking those tokens.
 *
 * SECURITY:
 *  - The raw token is a 32-byte CSPRNG secret, base64url-encoded. It is returned
 *    to the caller exactly ONCE (at mint) and never persisted in raw form.
 *  - Only the SHA-256 hash is stored (extension_tokens.token_hash, 0014). A DB
 *    leak therefore exposes no usable token.
 *  - Verification hashes the presented token and compares in constant time, then
 *    checks the row is not revoked and not expired.
 *  - extension_tokens is deny-all to the browser (RLS, 0005/0014); every access
 *    here goes through the service-role admin client — hence `server-only`.
 *
 * Tokens are long-lived by default (no expiry) but individually revocable, which
 * is the §17 rationale: extension auth decoupled from the web-session lifecycle.
 */

/** Hex SHA-256 of the raw token — what we store and look up by. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

/** Constant-time compare of two hex hashes (equal length by construction). */
function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export type MintedToken = {
  /** The RAW token — shown to the user once, then stored only in the extension. */
  token: string
  /** The row id (for later revocation / display). */
  id: string
}

/**
 * Mint a new extension token for `userId`. Returns the raw token exactly once.
 * The caller (the /settings Server Action) must run under an authenticated
 * session and pass its own resolved userId — this function trusts the userId.
 */
export async function mintExtensionToken(
  userId: string,
  label?: string | null,
): Promise<MintedToken | null> {
  const raw = randomBytes(32).toString('base64url')
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('extension_tokens')
    .insert({
      user_id: userId,
      token_hash: hashToken(raw),
      label: label ? label.trim().slice(0, 80) : null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('mintExtensionToken: insert failed', { message: error?.message })
    return null
  }
  return { token: raw, id: data.id }
}

/**
 * Verify a raw bearer token. Returns the owning userId when the token is valid
 * (exists, not revoked, not expired), else null. Best-effort updates
 * last_used_at. Never throws for a bad token — an unknown/garbage value returns
 * null so the route replies 401 cleanly.
 */
export async function verifyExtensionToken(
  raw: string | null | undefined,
): Promise<string | null> {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  try {
    const hash = hashToken(trimmed)
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('extension_tokens')
      .select('id, user_id, token_hash, revoked_at, expires_at')
      .eq('token_hash', hash)
      .maybeSingle()

    if (error || !data) return null
    // Defence-in-depth: the lookup is already by hash, but compare in constant
    // time to keep the verification path uniform and avoid leaking via timing.
    if (!hashesEqual(data.token_hash, hash)) return null
    if (data.revoked_at) return null
    if (data.expires_at && new Date(data.expires_at) <= new Date()) return null

    // Best-effort usage stamp; a failure here must not fail authentication.
    await admin
      .from('extension_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return data.user_id as string
  } catch {
    // Missing service-role key or transient DB error → treat as unauthenticated.
    return null
  }
}

/**
 * Revoke a token owned by `userId` (sets revoked_at). Scoped by user_id so a
 * caller can only revoke their own tokens even though the write is service-role.
 * Returns true when a row was revoked.
 */
export async function revokeExtensionToken(
  userId: string,
  tokenId: string,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('extension_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('revokeExtensionToken: update failed', { message: error.message })
    return false
  }
  return Boolean(data)
}
