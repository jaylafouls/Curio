'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupportedLocale, routing } from '@/lib/i18n/routing'
import { emitNotification } from '@/lib/notifications/emit'
import { UNIVERSE_COLORS, type UniverseColor } from './types'

/**
 * Onboarding Server Actions — the funnel's three write points (screens 03/04/05).
 *
 * All run authenticated; each re-derives the user from the session (never trusts
 * a client-passed id) and writes through RLS with the caller's session. Inputs
 * are validated against the spec/data-model constraints server-side, since the
 * client is untrusted.
 *
 * Shape: each returns `{ ok: true }` or `{ ok: false, error: 'code' }` so the
 * client can surface a localized message, EXCEPT completeOnboarding, which
 * redirects on success (screen 05 → 06 lives client-side, the redirect to /home
 * happens later from screen 07).
 */

type ActionResult = { ok: true } | { ok: false; error: 'unauthenticated' | 'invalid' | 'server' }

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Screen 03 — persist chosen topics into user_topics (user_id, topic_id).
 * Replaces the full set each save so back-navigation and re-submits are
 * idempotent. Validates that every id is a real active topic (defence against a
 * forged id that would fail the FK anyway, but we want a clean error not a 500).
 */
export async function saveTopics(topicIds: string[]): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()

  // Keep only ids that are real active topics; reject if the client sent junk.
  const { data: valid, error: topicErr } = await supabase
    .from('topics')
    .select('id')
    .in('id', topicIds)
    .eq('is_active', true)
  if (topicErr) {
    console.error('saveTopics: topic validation failed', { message: topicErr.message })
    return { ok: false, error: 'server' }
  }
  const validIds = (valid ?? []).map((r) => r.id)
  if (validIds.length === 0) return { ok: false, error: 'invalid' }

  // Replace the user's selection: delete existing, insert the new set.
  const { error: delErr } = await supabase
    .from('user_topics')
    .delete()
    .eq('user_id', userId)
  if (delErr) {
    console.error('saveTopics: clear failed', { message: delErr.message })
    return { ok: false, error: 'server' }
  }

  const rows = validIds.map((topic_id) => ({ user_id: userId, topic_id }))
  const { error: insErr } = await supabase.from('user_topics').insert(rows)
  if (insErr) {
    console.error('saveTopics: insert failed', { message: insErr.message })
    return { ok: false, error: 'server' }
  }

  return { ok: true }
}

/**
 * Screen 04 — follow a curator: insert into follows (follower_id, followed_id).
 * Guards the self-follow (also a DB check) and dedupes on the unique constraint
 * so a double-tap is a no-op, not an error.
 *
 * On a NEWLY created follow, emit a 'follow' notification to the followed user
 * (chantier notifications). Re-following an already-followed curator is a no-op
 * that must NOT re-notify, so we detect the fresh insert via the returned rows:
 * ignoreDuplicates returns an empty set when the row already existed. Emission
 * is best-effort and never fails the follow (see emitNotification).
 */
export async function followCurator(followedId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!followedId || followedId === userId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .upsert(
      { follower_id: userId, followed_id: followedId },
      { onConflict: 'follower_id,followed_id', ignoreDuplicates: true },
    )
    .select('id')
  if (error) {
    console.error('followCurator: insert failed', { message: error.message })
    return { ok: false, error: 'server' }
  }

  // A fresh follow returns the inserted row; a duplicate returns []. Only notify
  // on a genuinely new follow edge, so a re-follow does not spam the recipient.
  if ((data?.length ?? 0) > 0) {
    await emitNotification({
      recipientId: followedId,
      actorId: userId,
      type: 'follow',
      targetType: 'user',
      targetId: followedId,
    })
  }

  return { ok: true }
}

/** Screen 04 — unfollow (toggle off), matching the follow write. */
export async function unfollowCurator(followedId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!followedId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('followed_id', followedId)
  if (error) {
    console.error('unfollowCurator: delete failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}

/**
 * Viewer's follow relationship to a curator, for the Follow button on a public
 * profile (recette P1-1). Mirrors getCollectionFollowState: the public profile
 * is ISR-cached and cookie-free, so viewer identity is resolved AFTER hydration
 * by this action, never during the cached render.
 *
 *   - logged out           -> { loggedIn: false }, the button routes to sign-in.
 *   - viewing own profile   -> { isSelf: true }, no follow affordance.
 *   - logged-in other       -> isFollowing reflects the follows row.
 */
export type CuratorFollowState = {
  loggedIn: boolean
  isSelf: boolean
  isFollowing: boolean
}

export async function getCuratorFollowState(
  curatorId: string,
): Promise<CuratorFollowState> {
  const loggedOut: CuratorFollowState = {
    loggedIn: false,
    isSelf: false,
    isFollowing: false,
  }
  if (!curatorId) return loggedOut

  const userId = await getUserId()
  if (!userId) return loggedOut

  if (userId === curatorId) {
    return { loggedIn: true, isSelf: true, isFollowing: false }
  }

  const supabase = await createClient()
  // The caller can read their own follow edge; head+count avoids pulling the row.
  const { count } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId)
    .eq('followed_id', curatorId)

  return {
    loggedIn: true,
    isSelf: false,
    isFollowing: (count ?? 0) > 0,
  }
}

/**
 * Screen 05 — create the universe: update users.universe_name / universe_color.
 * name: 1-20 chars (trimmed); color: one of the 5-value enum (violet default).
 * Does NOT flip onboarding_completed — that happens at screen 07 ("Let's go"),
 * so a user who abandons between 05 and 07 resumes the funnel rather than
 * landing on Home half-set-up.
 */
export async function saveUniverse(
  name: string,
  color: string,
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const trimmed = (name ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 20) {
    return { ok: false, error: 'invalid' }
  }
  if (!(UNIVERSE_COLORS as readonly string[]).includes(color)) {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({
      universe_name: trimmed,
      universe_color: color as UniverseColor,
    })
    .eq('id', userId)
  if (error) {
    console.error('saveUniverse: update failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}

/**
 * Screen 07 — finish onboarding: flip users.onboarding_completed = true, then
 * redirect to /home. This is the funnel's exit. Redirect is server-side so the
 * middleware sees onboarding_completed=true immediately and won't bounce the
 * user back. `locale` is validated to keep the redirect target safe.
 */
export async function completeOnboarding(locale: string): Promise<void> {
  const safeLocale = isSupportedLocale(locale) ? locale : routing.defaultLocale
  const userId = await getUserId()
  if (!userId) {
    redirect(`/${safeLocale}`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', userId)
  if (error) {
    // Log and still send the user forward — a stuck funnel is worse than a
    // profile flag that can be re-flipped. The callback re-checks the flag.
    console.error('completeOnboarding: update failed', {
      userId,
      message: error.message,
    })
  }

  redirect(`/${safeLocale}/home`)
}
