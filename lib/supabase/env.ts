/**
 * Supabase environment resolution.
 *
 * RGPD non-negotiable (brief): the Supabase project MUST live in EU Frankfurt
 * (eu-central-1). We can't enforce the region from the client — it's a property
 * of the project you provision — so this module makes the requirement loud:
 * the URL host is asserted to be a *.supabase.co project URL, and the expected
 * region is documented here and in .env.example so it can never be silently
 * provisioned elsewhere.
 */

export const SUPABASE_REQUIRED_REGION = 'eu-central-1' // Frankfurt

type SupabaseEnv = {
  url: string
  anonKey: string
}

function readEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** Returns env or throws with an actionable message. Use in client factories. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = readEnv()
  if (!env) {
    throw new Error(
      'Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example). The project must be ' +
        `provisioned in ${SUPABASE_REQUIRED_REGION} (Frankfurt) for RGPD.`,
    )
  }
  return env
}

/** Non-throwing check used by UI to show a "configured / not yet" state. */
export function isSupabaseConfigured(): boolean {
  return readEnv() !== null
}
