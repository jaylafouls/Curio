import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  type ThemePreference,
} from './types'

/**
 * Server-side read of the signed-in user's persisted theme preference
 * (`users.theme_preference`, migration 0002). Used by the connected AppShell to
 * apply the correct mode class in the initial SSR HTML — no client flash.
 *
 * Reads through the AUTHENTICATED server client so RLS scopes the row to the
 * caller (own profile only). Falls back to the DB default ('light' = Archive) on
 * a lapsed session or any error, so the shell never breaks on a theme read and
 * an anonymous/errored request lands on the light default the app assumes.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_THEME_PREFERENCE

  const { data, error } = await supabase
    .from('users')
    .select('theme_preference')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('theme: failed to load preference', { message: error.message })
    return DEFAULT_THEME_PREFERENCE
  }

  const pref = (data as { theme_preference?: unknown } | null)?.theme_preference
  return isThemePreference(pref) ? pref : DEFAULT_THEME_PREFERENCE
}
