import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server-side reads for the extension-token management surface (/settings
 * "Connect the Chrome extension", Phase 5 chantier 5).
 *
 * extension_tokens is deny-all to the browser (RLS, 0014) — only the service-role
 * client reaches it. So this read goes through the admin client, scoped
 * explicitly by owner (`user_id`) exactly like the write paths in token.ts. The
 * caller (the /settings page) resolves its own userId from the session first and
 * passes it in; we never trust a client id.
 *
 * We surface NO token material here — only metadata (id, label, timestamps,
 * revoked flag) so a user can recognise and prune their tokens. The raw token
 * exists only once at mint time (token.ts) and never comes back.
 */

export type ExtensionTokenSummary = {
  id: string
  label: string | null
  /** ISO. */
  createdAt: string
  /** ISO, or null if never used since mint. */
  lastUsedAt: string | null
  /** ISO, or null if this token has no expiry. */
  expiresAt: string | null
  /** True once revoked; the /settings list greys these out (or hides them). */
  revoked: boolean
}

/**
 * The user's extension tokens, most-recent first. Only ACTIVE (non-revoked)
 * tokens are returned — a revoked token is dead and cleaning it from the list
 * keeps the surface honest ("these are the tokens that can reach your account").
 * Returns [] on any error so the section renders its empty state rather than
 * breaking the page.
 */
export async function getActiveExtensionTokens(
  userId: string,
): Promise<ExtensionTokenSummary[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('extension_tokens')
    .select('id, label, created_at, last_used_at, expires_at, revoked_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getActiveExtensionTokens: read failed', {
      message: error.message,
    })
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: (row.label as string | null) ?? null,
    createdAt: row.created_at as string,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    revoked: Boolean(row.revoked_at),
  }))
}
