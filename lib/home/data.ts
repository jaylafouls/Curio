import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { getOwnerCollectionMosaics } from '@/lib/collections/data'
import type { AppCollection } from '@/lib/app/data'

/**
 * Server-side data for the CONNECTED Home feed (spec §8.2, chantier 12).
 *
 * Three feed surfaces, each a plain deterministic query — no engagement-scored
 * recommendation algorithm (Decisions Log §5quater: personalisation is by
 * explicit preference only, never by an opaque score):
 *
 *  - Following : public collections owned by curators the user follows,
 *    strictly chronological (newest first). Pure signal, no ranking.
 *  - For you   : public collections whose topic_id is one of the Topics the
 *    user chose at onboarding (user_topics), newest first.
 *  - Trending  : public collections ranked by follower count
 *    (collection_follows) then recency. NOT personalised.
 *
 * Every read goes through the AUTHENTICATED server client so RLS applies with
 * the caller's session:
 *  - collections_select_public_or_owner exposes other users' PUBLIC collections
 *  - follows_select_public / collection_follows_select_public expose the graphs
 *
 * No service-role, no fake seeding: a fresh account with no follows sees the
 * designed empty state; a topic with no public collections yet renders empty.
 */

/** Narrow a DB topic id to the Badge palette union (all 10 core are members). */
function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

// The collection shape the Home cards need. `followers` is the live
// collection_follows head-count (there is no denormalized column — Data Model
// §6 keeps counts on-demand), used only to rank the Trending tab.
export type FeedCollection = AppCollection & { followers: number }

type FeedRow = {
  id: string
  slug: string
  name: string
  description: string | null
  cover_image_url: string | null
  topic_id: string
  is_public: boolean
  links_count: number
  created_at: string
  owner:
    | { display_name: string; avatar_url: string | null; username: string }
    | { display_name: string; avatar_url: string | null; username: string }[]
    | null
  // Supabase embedded aggregate: [{ count: n }] for the row's follows.
  collection_follows: { count: number }[] | null
}

const FEED_SELECT =
  'id, slug, name, description, cover_image_url, topic_id, is_public, ' +
  'links_count, created_at, ' +
  'owner:users!collections_owner_id_fkey (display_name, avatar_url, username), ' +
  'collection_follows (count)'

/** Feed cards carry an optional teaser (collection description) for the overlay. */
export type FeedCollectionWithTeaser = FeedCollection & {
  description: string | null
}

function mapFeedRow(row: FeedRow): FeedCollectionWithTeaser {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    description: row.description,
    topic: row.topic_id as BadgeTopic,
    cover: row.cover_image_url,
    isPublic: row.is_public,
    linksCount: row.links_count ?? 0,
    followers: row.collection_follows?.[0]?.count ?? 0,
    owner: {
      name: owner?.display_name ?? '',
      avatar: owner?.avatar_url ?? null,
      username: owner?.username ?? '',
    },
  }
}

/**
 * Attach tier-2 mosaic images to coverless feed cards. Feed collections are
 * other users' PUBLIC collections read through the session client; their public
 * links are visible under RLS, so the owner-context batch is correct here.
 */
async function withFeedMosaics(
  rows: FeedCollectionWithTeaser[],
): Promise<FeedCollectionWithTeaser[]> {
  const coverlessIds = rows.filter((c) => !c.cover).map((c) => c.id)
  if (coverlessIds.length === 0) return rows
  const mosaics = await getOwnerCollectionMosaics(coverlessIds)
  return rows.map((c) => (c.cover ? c : { ...c, mosaic: mosaics[c.id] }))
}

// ── Following: chronological collections from followed curators ──────────────

/**
 * Public collections owned by the curators the user follows, newest first
 * (§8.2, Following tab). Two steps because the follow graph and collections
 * live in separate tables: resolve followed ids, then fetch their public
 * collections. Empty (→ the "follow curators" empty state) when the user
 * follows no one, or their curators have published nothing public.
 */
export async function getFollowingFeed(
  userId: string,
  limit = 24,
): Promise<FeedCollectionWithTeaser[]> {
  const supabase = await createClient()

  const { data: follows, error: followErr } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId)

  if (followErr) {
    console.error('home: failed to load follows', { message: followErr.message })
    return []
  }
  const followedIds = (follows ?? []).map((f) => f.followed_id as string)
  if (followedIds.length === 0) return []

  const { data, error } = await supabase
    .from('collections')
    .select(FEED_SELECT)
    .in('owner_id', followedIds)
    // Never surface the caller's own collections in their feed, even via a
    // self-follow edge (§8.2: the feed is other curators' work, not a mirror).
    .neq('owner_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('home: failed to load following feed', {
      message: error.message,
    })
    return []
  }

  return withFeedMosaics(
    ((data ?? []) as unknown as FeedRow[])
      .filter((row) => isBadgeTopic(row.topic_id))
      .map(mapFeedRow),
  )
}

// ── For you: public collections matching the user's onboarding Topics ────────

/**
 * Public collections whose topic is one of the user's chosen onboarding Topics
 * (user_topics), newest first (§8.2, For you tab). Explicit-preference
 * personalisation only — no engagement score. Empty when the user picked no
 * topics (shouldn't happen post-onboarding) or nothing public matches yet.
 */
export async function getForYouFeed(
  userId: string,
  limit = 24,
): Promise<FeedCollectionWithTeaser[]> {
  const supabase = await createClient()

  const { data: userTopics, error: topicErr } = await supabase
    .from('user_topics')
    .select('topic_id')
    .eq('user_id', userId)

  if (topicErr) {
    console.error('home: failed to load user topics', {
      message: topicErr.message,
    })
    return []
  }
  const topicIds = (userTopics ?? [])
    .map((t) => t.topic_id as string)
    .filter(isBadgeTopic)
  if (topicIds.length === 0) return []

  const { data, error } = await supabase
    .from('collections')
    .select(FEED_SELECT)
    .in('topic_id', topicIds)
    // Exclude the caller's own collections: "For you" recommends OTHER curators'
    // work matching your Topics, never mirrors your own back at you (recette P1
    // #5 — a curator was seeing their own public collections in their feed).
    .neq('owner_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('home: failed to load for-you feed', { message: error.message })
    return []
  }

  return withFeedMosaics(
    ((data ?? []) as unknown as FeedRow[])
      .filter((row) => isBadgeTopic(row.topic_id))
      .map(mapFeedRow),
  )
}

// ── Trending: public collections by follower count then recency ──────────────

/**
 * Public collections ranked by follower count (collection_follows) then
 * recency (§8.2, Trending tab). Not personalised. Because follower count is
 * on-demand (no denormalized column), we fetch a recent public window with the
 * embedded follows aggregate and sort in memory: correct while the corpus is
 * small, and honest about the count rather than approximating it. `window`
 * bounds how many recent public collections we consider before ranking.
 *
 * `userId` excludes the caller's own collections (recette P1 #5): Trending shows
 * what's popular among OTHER curators, not the caller's own work ranked back at
 * them.
 */
export async function getTrendingFeed(
  userId: string,
  limit = 24,
  window = 200,
): Promise<FeedCollectionWithTeaser[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('collections')
    .select(FEED_SELECT)
    .neq('owner_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(window)

  if (error) {
    console.error('home: failed to load trending feed', {
      message: error.message,
    })
    return []
  }

  return withFeedMosaics(
    ((data ?? []) as unknown as FeedRow[])
      .filter((row) => isBadgeTopic(row.topic_id))
      .map(mapFeedRow)
      .sort((a, b) => {
        if (b.followers !== a.followers) return b.followers - a.followers
        // Tie-break on recency: mapFeedRow drops created_at, so rows already
        // arrive newest-first from the query — a stable sort preserves that for
        // equal follower counts.
        return 0
      })
      .slice(0, limit),
  )
}

// ── From your curators: recent public activity from follows ──────────────────

export type CuratorActivity = {
  collectionId: string
  slug: string
  collectionTitle: string
  topic: BadgeTopic
  createdAt: string
  curator: { displayName: string; username: string; avatarUrl: string | null }
}

/**
 * Recent public collections published by curators the user follows — the
 * "From your curators" activity strip (§8.2). Same follow graph as the
 * Following tab, shaped as an activity line (who published what, when). Empty
 * when the user follows no one or their curators have published nothing public.
 */
export async function getRecentCuratorActivity(
  userId: string,
  limit = 6,
): Promise<CuratorActivity[]> {
  const supabase = await createClient()

  const { data: follows, error: followErr } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId)

  if (followErr) {
    console.error('home: failed to load follows for activity', {
      message: followErr.message,
    })
    return []
  }
  const followedIds = (follows ?? []).map((f) => f.followed_id as string)
  if (followedIds.length === 0) return []

  const { data, error } = await supabase
    .from('collections')
    .select(
      'id, slug, name, topic_id, created_at, ' +
        'owner:users!collections_owner_id_fkey (display_name, avatar_url, username)',
    )
    .in('owner_id', followedIds)
    // Same self-exclusion guard as the Following feed (self-follow edge).
    .neq('owner_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('home: failed to load curator activity', {
      message: error.message,
    })
    return []
  }

  type Row = {
    id: string
    slug: string
    name: string
    topic_id: string
    created_at: string
    owner:
      | { display_name: string; avatar_url: string | null; username: string }
      | { display_name: string; avatar_url: string | null; username: string }[]
      | null
  }

  return ((data ?? []) as unknown as Row[])
    .filter((row) => isBadgeTopic(row.topic_id))
    .map((row) => {
      const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
      return {
        collectionId: row.id,
        slug: row.slug,
        collectionTitle: row.name,
        topic: row.topic_id as BadgeTopic,
        createdAt: row.created_at,
        curator: {
          displayName: owner?.display_name ?? '',
          username: owner?.username ?? '',
          avatarUrl: owner?.avatar_url ?? null,
        },
      }
    })
}
