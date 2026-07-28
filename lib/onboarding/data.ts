import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import type { CuratorSuggestion, Topic } from './types'

/**
 * Server-side data for the onboarding funnel (screens 03-08).
 *
 * `topics` is public reference data (RLS: topics_select_public); curator
 * suggestions read the public users graph. Both use the request-scoped server
 * client so they respect RLS with the caller's session.
 */

/** Narrow a DB topic id to the Badge palette union (all 10 core are members). */
function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

/**
 * The 10 active Core Topics, locale-resolved and ordered (Data Model §3).
 * Only `is_core AND is_active` rows — the 3 Extended topics stay hidden in V1.
 * This is the authoritative list for screen 03, NOT the mockup (which showed
 * Wellness/Business; superseded by Decisions Log §5bis — spec wins).
 */
export async function getActiveCoreTopics(locale: Locale): Promise<Topic[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topics')
    .select('id, label_en, label_fr, icon, display_order')
    .eq('is_core', true)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('onboarding: failed to load topics', { message: error.message })
    return []
  }

  return (data ?? [])
    .filter((row) => isBadgeTopic(row.id))
    .map((row) => ({
      id: row.id as BadgeTopic,
      label: locale === 'fr' ? row.label_fr : row.label_en,
      icon: row.icon,
    }))
}

/** The topic ids the user already selected (for resuming an interrupted flow). */
export async function getSelectedTopicIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_topics')
    .select('topic_id')
    .eq('user_id', userId)

  if (error) {
    console.error('onboarding: failed to load user_topics', {
      message: error.message,
    })
    return []
  }
  return (data ?? []).map((row) => row.topic_id)
}

/**
 * Curator suggestions for screen 04, based on the user's chosen topics.
 *
 * Production returns [] today: no Founding Curators have been recruited, so
 * there is no one to suggest. The brief is explicit — do NOT seed fake curators.
 * The query below is the real one; the moment curator profiles exist it returns
 * them with no further code change. Until then, screen 04 shows its designed
 * empty state and a "Skip for now" CTA.
 *
 * A "curator" here = a public user, other than the current user, who is a
 * founding curator (the only curator signal available in V1). Ordering by
 * follower count would need an aggregate; kept simple (recent first) until the
 * suggestion algorithm is specced.
 */
export async function getCuratorSuggestions(
  userId: string,
  _topicIds: string[],
): Promise<CuratorSuggestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio')
    .eq('is_founding_curator', true)
    .neq('id', userId)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    console.error('onboarding: failed to load curator suggestions', {
      message: error.message,
    })
    return []
  }

  // Map to the card shape. Topic/role/followers are best-effort until a
  // suggestion algorithm is specced; today this list is empty in prod anyway.
  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    topic: 'ideas' as BadgeTopic,
    role: 'Curator',
    bio: row.bio ?? '',
    followers: 0,
  }))
}
