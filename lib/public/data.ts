import { createClient } from '@supabase/supabase-js'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { requireSupabaseEnv } from '@/lib/supabase/env'
import { getPublicCollectionMosaics } from '@/lib/collections/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Server-side data for the public (non-authenticated) marketing pages —
 * Landing / Explore / Curators / About (spec §8.1-8.6).
 *
 * Everything reads through the ANON client so what the page renders is exactly
 * what an anonymous crawler/visitor is allowed to see under RLS
 * (users_select_public, collections_select_public_or_owner). No service-role,
 * no cookies — these pages are cacheable and identical for everyone.
 *
 * Production returns empty collections/curators today (0 public collections, no
 * Founding Curators recruited). The queries are the real ones: they activate
 * automatically the moment public rows exist. Per project non-negotiable, NO
 * fake seeding — the pages render their designed empty states instead.
 */

/**
 * Anon Supabase client — request-scoped, sessionless. A public page must
 * reflect exactly the anonymous-visible slice of the DB, so reads never use the
 * service role. Mirrors the sitemap's anon client (app/sitemap.ts).
 */
function anonClient() {
  const { url, anonKey } = requireSupabaseEnv()
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Narrow a DB topic id to the Badge palette union (all 10 core are members). */
function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

// ── Topics (orbital viz + explore tabs) ─────────────────────────────────────

export type PublicTopic = {
  id: BadgeTopic
  label: string
  icon: string
  /** Number of PUBLIC collections in this topic. 0 today (no public rows). */
  collectionCount: number
}

/**
 * The 10 active Core Topics, locale-resolved and ordered, each with its count
 * of public collections. The count is a real aggregate over anon-visible rows,
 * so it reads 0 across the board today and rises as public collections are
 * created — never a fabricated "128 collections" number.
 *
 * Two queries (topics, then per-topic public counts) kept simple over a single
 * grouped RPC: the topic set is fixed at 10 and this runs on cacheable public
 * pages, so the extra round-trip is negligible and the code stays readable.
 */
export async function getPublicTopics(locale: Locale): Promise<PublicTopic[]> {
  const supabase = anonClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, label_en, label_fr, icon, display_order')
    .eq('is_core', true)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('public: failed to load topics', { message: error.message })
    return []
  }

  const core = (topics ?? []).filter((row) => isBadgeTopic(row.id))

  // Count public collections per topic. Anon RLS already restricts to is_public
  // rows; the explicit filter documents intent at the call site. Runs in
  // parallel — one lightweight head-count per topic.
  const counts = await Promise.all(
    core.map(async (row) => {
      const { count, error: countErr } = await supabase
        .from('collections')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('topic_id', row.id)
      if (countErr) {
        console.error('public: failed to count collections', {
          topic: row.id,
          message: countErr.message,
        })
        return 0
      }
      return count ?? 0
    }),
  )

  return core.map((row, i) => ({
    id: row.id as BadgeTopic,
    label: locale === 'fr' ? row.label_fr : row.label_en,
    icon: row.icon,
    collectionCount: counts[i],
  }))
}

// ── Public collections (landing cards + explore) ────────────────────────────

export type PublicCollection = {
  id: string
  slug: string
  title: string
  topic: BadgeTopic
  cover: string | null
  description: string | null
  linksCount: number
  owner: { name: string; avatar: string | null; username: string }
  /** Up to 4 link-image URLs for the coverless 2×2 mosaic (cover tier 2). */
  mosaic?: string[]
}

/**
 * Public collections for the landing "Explore inspiring universes" strip and
 * the explore feed. Empty today (0 public collections). `topic_id` narrows to
 * the badge palette; a row with an off-palette topic is dropped rather than
 * crashing the card. `links_count` is the real trigger-maintained column
 * (chantier 10 migration 0010).
 */
export async function getPublicCollections(
  limit = 5,
): Promise<PublicCollection[]> {
  const supabase = anonClient()

  const { data, error } = await supabase
    .from('collections')
    .select(
      'id, slug, name, description, cover_image_url, topic_id, links_count, ' +
        'owner:users!collections_owner_id_fkey (display_name, avatar_url, username)',
    )
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('public: failed to load collections', {
      message: error.message,
    })
    return []
  }

  type Row = {
    id: string
    slug: string
    name: string
    description: string | null
    cover_image_url: string | null
    topic_id: string
    links_count: number
    owner:
      | { display_name: string; avatar_url: string | null; username: string }
      | { display_name: string; avatar_url: string | null; username: string }[]
      | null
  }

  const collections: PublicCollection[] = ((data ?? []) as unknown as Row[])
    .filter((row) => isBadgeTopic(row.topic_id))
    .map((row) => {
      // Supabase types a to-one embed as an array; normalise to the single row.
      const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        topic: row.topic_id as BadgeTopic,
        cover: row.cover_image_url,
        description: row.description,
        linksCount: row.links_count ?? 0,
        owner: {
          name: owner?.display_name ?? '',
          avatar: owner?.avatar_url ?? null,
          username: owner?.username ?? '',
        },
      }
    })

  // Tier-2 mosaic for coverless public collections, batched over the anon client.
  const coverlessIds = collections.filter((c) => !c.cover).map((c) => c.id)
  if (coverlessIds.length === 0) return collections
  const mosaics = await getPublicCollectionMosaics(coverlessIds)
  return collections.map((c) =>
    c.cover ? c : { ...c, mosaic: mosaics[c.id] },
  )
}

// ── Public curators (curators page) ─────────────────────────────────────────

export type PublicCurator = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  /** Real follower head-count (recette P1-4) — no longer hardcoded to 0. */
  followersCount: number
}

/**
 * Public Founding Curators for the /curators grid. Empty today — no Founding
 * Curator has been recruited yet (recruitment happens off-app by invitation).
 * The query is real and world-readable (users_select_public); the moment a
 * founding curator profile exists it appears with no code change. Do NOT seed
 * fake curators — the page shows its designed empty state instead.
 */
export async function getPublicCurators(limit = 24): Promise<PublicCurator[]> {
  const supabase = anonClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, location')
    .eq('is_founding_curator', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('public: failed to load curators', { message: error.message })
    return []
  }

  const rows = data ?? []

  // Real follower head-count per curator (recette P1-4). The users table carries
  // no denormalized followers_count, so we head-count follows.followed_id per
  // curator in parallel — cheap on the fixed, small curator set and world-
  // readable under RLS. A count error degrades to 0 rather than failing the grid.
  const followerCounts = await Promise.all(
    rows.map(async (row) => {
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('followed_id', row.id)
      return count ?? 0
    }),
  )

  return rows.map((row, i) => ({
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    followersCount: followerCounts[i],
  }))
}

// ── Global stats (about page) ───────────────────────────────────────────────

export type GlobalStats = {
  curators: number
  collections: number
  links: number
}

/**
 * Global public stats for /about. Real head-counts over anon-visible rows, so
 * they read 0 today and grow with the product — never fabricated marketing
 * numbers. `links` counts distinct links in the catalogue (world-readable).
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = anonClient()

  const [curators, collections, links] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_founding_curator', true),
    supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true),
    supabase.from('links').select('id', { count: 'exact', head: true }),
  ])

  for (const r of [curators, collections, links]) {
    if (r.error) {
      console.error('public: failed to load global stats', {
        message: r.error.message,
      })
    }
  }

  return {
    curators: curators.count ?? 0,
    collections: collections.count ?? 0,
    links: links.count ?? 0,
  }
}
