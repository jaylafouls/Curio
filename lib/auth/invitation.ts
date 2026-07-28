import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Invitation-token handling (brief §4).
 *
 * A token arrives as a `?token=` query param on the Welcome screen. The rule:
 *   - valid + pending (+ not expired) → let the user in, NOTHING visually
 *     different; the founding-curator promotion happens later at signup.
 *   - absent / invalid / expired / revoked → no dedicated error screen; the
 *     Welcome screen shows a short notice and the user gets the normal
 *     Découvreur path (no badge, full access).
 *
 * invitation_tokens is deny-all to anon/authenticated (0005 RLS), so this read
 * uses the service-role client (server-only).
 */

export type InvitationTokenState = 'none' | 'valid' | 'invalid'

/**
 * Classify a raw token value from the URL. Returns 'none' when no token was
 * supplied, 'valid' for a pending, non-expired token, and 'invalid' for
 * anything else (used/expired/revoked/unknown). Never throws for a bad token —
 * a DB error degrades to 'invalid' so the Welcome screen still renders.
 */
export async function checkInvitationToken(
  token: string | undefined | null,
): Promise<InvitationTokenState> {
  if (!token) return 'none'

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('invitation_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) return 'invalid'
    if (data.status !== 'pending') return 'invalid'
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      return 'invalid'
    }
    return 'valid'
  } catch {
    // Missing service-role key or transient DB error → degrade gracefully.
    // A token we can't verify is treated as invalid (safe: no badge granted),
    // and the user still gets the standard Découvreur path.
    return 'invalid'
  }
}
