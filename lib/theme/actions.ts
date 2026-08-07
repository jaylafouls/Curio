'use server'

import { createClient } from '@/lib/supabase/server'
import { isThemePreference, type ThemePreference } from './types'

/**
 * Persist the signed-in user's theme preference (`users.theme_preference`,
 * spec §8.14 / Decisions Log §16 — the real toggle deferred to Phase 5).
 *
 * Mirrors the updateLanguage contract (lib/settings/actions.ts): runs
 * authenticated, re-derives the user from the session (never trusts a
 * client-passed id), and writes through RLS with the caller's session. The
 * value is validated against the DB CHECK ('light' | 'dark') before the write so
 * a bad value gets a clean 'invalid' rather than a constraint 500.
 *
 * The live class flip is done client-side by the toggle for immediate feedback;
 * this action only records the choice so it survives across sessions/devices and
 * is applied server-side on the next connected page load (AppShell).
 */
type Result =
  | { ok: true }
  | { ok: false; error: 'unauthenticated' | 'invalid' | 'server' }

export async function updateThemePreference(
  preference: ThemePreference,
): Promise<Result> {
  if (!isThemePreference(preference)) {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const { error } = await supabase
    .from('users')
    .update({ theme_preference: preference })
    .eq('id', user.id)
  if (error) {
    console.error('updateThemePreference: update failed', {
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }

  return { ok: true }
}
