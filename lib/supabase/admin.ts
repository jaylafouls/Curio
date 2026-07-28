import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from './env'

/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * `import 'server-only'` makes the build fail if this module is ever pulled into
 * a Client Component bundle, so the service-role key can never leak to the
 * browser. Used for the few operations that must bypass RLS:
 *   - reading invitation_tokens (deny-all to anon/authenticated per 0005 RLS)
 *   - any future server-side admin task
 *
 * It reads NO cookies and persists NO session (autoRefreshToken/persistSession
 * off) — it is a privileged, request-scoped client, not a user session.
 *
 * The service-role key is intentionally NOT wired into general app code this
 * chantier (Auth); it's used here only for the read-only invitation-token check
 * and the redeem RPC call, both of which are part of the Auth flow.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY missing. It lives in .env.local (server-side ' +
        'only) and is required to read invitation_tokens / call the redeem RPC.',
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
