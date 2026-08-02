import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/i18n/routing'
import type { UserProperties } from './events'

/**
 * Assemble the PostHog person properties for the current authenticated user
 * (spec §15.3), from data that actually exists today:
 *   • topics        → user_topics.topic_id
 *   • language      → the request locale (next-intl)
 *   • type          → 'curator' if users.is_founding_curator else 'discoverer'
 *   • signup_date   → users.created_at
 *   • plan          → plans.plan_type (real since Phase 4 — a plan row auto-
 *                     creates at signup, so this always resolves to at least 'free')
 *
 * `location` has no feature yet, so it is intentionally left undefined — never
 * fabricated (project non-negotiable). identifyUser drops undefined keys before
 * sending.
 *
 * Returns null when there is no session (anonymous) — nothing to identify.
 * Runs server-side (reads through RLS with the caller's session).
 */
export async function buildUserProperties(
  locale: Locale,
): Promise<{ distinctId: string; props: UserProperties } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: topicRows }, { data: planRow }] =
    await Promise.all([
      supabase
        .from('users')
        .select('is_founding_curator, created_at')
        .eq('id', user.id)
        .single(),
      supabase.from('user_topics').select('topic_id').eq('user_id', user.id),
      supabase
        .from('plans')
        .select('plan_type')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

  const topics = (topicRows ?? []).map((r) => r.topic_id as string)
  const plan = (planRow as { plan_type?: string } | null)?.plan_type

  return {
    distinctId: user.id,
    props: {
      topics,
      language: locale,
      type: profile?.is_founding_curator ? 'curator' : 'discoverer',
      signup_date: profile?.created_at ?? user.created_at,
      // A plan row auto-creates at signup; fall back to 'free' if the read failed.
      plan: plan ?? 'free',
      // location: no feature yet — left undefined on purpose.
    },
  }
}
