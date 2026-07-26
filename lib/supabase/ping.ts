import { createClient } from './server'
import { isSupabaseConfigured } from './env'

export type SupabasePing =
  | { status: 'ok' }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }

/**
 * Lightweight connectivity check for a Server Component (brief verification:
 * "ping simple depuis un composant serveur"). No tables exist yet (schema is a
 * later chantier), so we call auth.getSession() — a request that reaches the
 * Supabase Auth endpoint without needing any schema. A resolved response
 * (even "no session") proves the project URL + key reach EU Frankfurt.
 */
export async function pingSupabase(): Promise<SupabasePing> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' }
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.getSession()
    if (error) return { status: 'error', message: error.message }
    return { status: 'ok' }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown Supabase error',
    }
  }
}
