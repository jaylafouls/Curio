import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Server-side reads for /settings (chantier 13).
 *
 * All reads go through the AUTHENTICATED server client so RLS scopes rows to the
 * signed-in user (own profile only). No service-role here — editing one's own
 * account is an ordinary owner write; only the destructive delete-account path
 * (lib/settings/actions.ts) needs the admin client.
 */

// ── Editable profile + preferences ──────────────────────────────────────────

export type SettingsProfile = {
  id: string
  email: string | null
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  /** Persisted UI language preference ('en' | 'fr'). */
  language: Locale
}

/**
 * One read-only connection method on the account (Connected apps §8.14). V1 is
 * display-only — no link/unlink flow — so this is just the provider identity
 * surfaced from Supabase auth (`email` for password sign-in, `google` for OAuth).
 */
export type ConnectedIdentity = {
  provider: string
  /** The email/handle Supabase recorded for this identity, when available. */
  label: string | null
  /** When the identity was linked (ISO), for a "connected since" line. */
  connectedAt: string | null
}

/**
 * The signed-in user's editable profile + language preference, or null if the
 * session lapsed. Reads the `email` from auth.users (not duplicated in
 * public.users per data model §2) and the profile row from public.users.
 */
export async function getSettingsProfile(): Promise<SettingsProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select(
      'username, display_name, avatar_url, bio, location, website_url, language',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('settings: failed to load profile', { message: error.message })
    return null
  }
  if (!data) return null

  const row = data as {
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    location: string | null
    website_url: string | null
    language: string
  }

  return {
    id: user.id,
    email: user.email ?? null,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    websiteUrl: row.website_url,
    language: row.language === 'fr' ? 'fr' : 'en',
  }
}

/**
 * The account's connection methods, read-only (Connected apps §8.14). Derived
 * from Supabase auth identities: an `email` identity means password sign-in, a
 * `google` identity means Google OAuth. V1 shows what is linked; there is no
 * link/unlink flow. Returns [] on any error (the section then shows its empty
 * hint rather than breaking the page).
 */
export async function getConnectedIdentities(): Promise<ConnectedIdentity[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // `identities` is populated by getUser(); each carries provider + identity_data.
  const identities = user.identities ?? []
  return identities.map((identity) => {
    const idData = (identity.identity_data ?? {}) as Record<string, unknown>
    const label =
      typeof idData.email === 'string'
        ? idData.email
        : typeof idData.name === 'string'
          ? idData.name
          : null
    return {
      provider: identity.provider,
      label,
      connectedAt:
        typeof identity.created_at === 'string' ? identity.created_at : null,
    }
  })
}
