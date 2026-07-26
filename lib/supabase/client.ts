import { createBrowserClient } from '@supabase/ssr'
import { requireSupabaseEnv } from './env'

/**
 * Browser Supabase client (Client Components).
 *
 * Auth is wired in the "Auth" chantier; for now this only provides a typed
 * client. It sets no non-essential cookies — Supabase auth cookies are
 * strictly necessary (they only exist once a user authenticates), which keeps
 * us compliant with the "no non-essential cookie by default" RGPD rule.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
