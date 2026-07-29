'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONSENT_POLICY_VERSION, type ConsentState } from './types'

/**
 * Consent journal writer (brief part 2, RGPD spec §15.3).
 *
 * On every consent decision the CMP calls this Server Action with the resolved
 * per-category state. We write one consent_logs row PER category so the journal
 * records each grant/denial independently against the policy version in force.
 *
 * Why a Server Action + service-role insert (not a browser insert):
 *   • user_id must be nullable — the brief requires logging anonymous visitors
 *     (user_id null). But the consent_logs RLS policy is INSERT-with-check
 *     (auth.uid() = user_id), which REJECTS a null user_id (null = null → null,
 *     not true). So an anonymous row cannot be written by an anon/authenticated
 *     client at all. The correct path is a trusted server write via the
 *     service-role client, which bypasses RLS. The browser never writes here.
 *   • user_id is derived from the session server-side, never trusted from the
 *     client, so a caller cannot forge someone else's consent record.
 *
 * `necessary` is logged too (always given=true) so the journal is a complete
 * snapshot of the choice, not just the optional categories.
 */

export type LogConsentResult = { ok: true } | { ok: false; error: string }

export async function logConsent(
  state: ConsentState,
): Promise<LogConsentResult> {
  // Derive the user from the session (nullable → anonymous visitor).
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch (err) {
    // A missing/invalid session is normal for an anonymous visitor — log as null
    // rather than failing the consent write (consent must be recorded either way).
    console.warn('logConsent: no session, recording as anonymous', {
      message: err instanceof Error ? err.message : String(err),
    })
  }

  const rows = (
    Object.entries(state) as [keyof ConsentState, boolean][]
  ).map(([consent_type, given]) => ({
    user_id: userId,
    consent_type,
    given,
    policy_version: CONSENT_POLICY_VERSION,
  }))

  // Service-role insert: bypasses RLS so an anonymous (user_id null) row is
  // allowed. This module is 'use server' + admin.ts is 'server-only', so the
  // service-role key never reaches the browser bundle.
  const admin = createAdminClient()
  const { error } = await admin.from('consent_logs').insert(rows)
  if (error) {
    console.error('logConsent: insert failed', {
      userId,
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}
