import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { getOwnerCollectionMosaics } from '@/lib/collections/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Server-side data for the CONNECTED app pages (Phase 3, chantier 9) —
 * /my-space, /saved, and the read side of /profile/[username].
 *
 * Every read goes through the AUTHENTICATED server client (lib/supabase/server),
 * so RLS scopes rows to the signed-in user exactly as the policies intend:
 *  - own profile / own collections / own user_links (owner-only policies)
 *  - a visited profile's PUBLIC collections only (collections_select_public)
 *
 * No service-role here: these are ordinary owner/public reads, not the
 * privileged writes that Phase 3's save-flow (chantier 11) will need. No fake
 * seeding — pages render their designed empty states when a user has nothing yet
 * (project non-negotiable, same rule as the public pages).
 */

/** Narrow a DB topic id to the Badge palette union (all 10 core are members). */
function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

// ── Current authenticated user ──────────────────────────────────────────────

export type AppUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  universeName: string | null
  universeColor: string | null
  isFoundingCurator: boolean
  createdAt: string
}

/**
 * The signed-in user's profile row, or null if unauthenticated. `cache()`
 * dedupes the auth round-trip across a request so a page + its shell can both
 * call this without a double fetch. Middleware already guards protected routes,
 * so on those pages this resolves to a real user; the null branch is the belt-
 * and-braces path for a race where the session lapsed mid-request.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, username, display_name, avatar_url, bio, location, website_url, ' +
        'universe_name, universe_color, is_founding_curator, created_at',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('app: failed to load current user', { message: error.message })
    return null
  }
  if (!data) return null

  // The runtime-concatenated select string defeats the client's row-shape
  // inference, so name the shape explicitly.
  const row = data as unknown as {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    location: string | null
    website_url: string | null
    universe_name: string | null
    universe_color: string | null
    is_founding_curator: boolean
    created_at: string
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    websiteUrl: row.website_url,
    universeName: row.universe_name,
    universeColor: row.universe_color,
    isFoundingCurator: row.is_founding_curator,
    createdAt: row.created_at,
  }
})

// ── Topics ──────────────────────────────────────────────────────────────────

export type AppTopic = { id: BadgeTopic; label: string; icon: string }

/**
 * The user's chosen onboarding Topics (user_topics), locale-resolved and ordered
 * by the topic display order. Shown as the profile's active-topic pills (§8.9).
 */
export async function getUserTopics(
  userId: string,
  locale: Locale,
): Promise<AppTopic[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_topics')
    .select('topic:topics (id, label_en, label_fr, icon, display_order)')
    .eq('user_id', userId)

  if (error) {
    console.error('app: failed to load user topics', { message: error.message })
    return []
  }

  type Row = {
    topic:
      | {
          id: string
          label_en: string
          label_fr: string
          icon: string
          display_order: number
        }
      | {
          id: string
          label_en: string
          label_fr: string
          icon: string
          display_order: number
        }[]
      | null
  }

  return ((data ?? []) as unknown as Row[])
    .map((row) => (Array.isArray(row.topic) ? row.topic[0] : row.topic))
    .filter(
      (t): t is NonNullable<typeof t> => t != null && isBadgeTopic(t.id),
    )
    .sort((a, b) => a.display_order - b.display_order)
    .map((t) => ({
      id: t.id as BadgeTopic,
      label: locale === 'fr' ? t.label_fr : t.label_en,
      icon: t.icon,
    }))
}

// ── Collections (My Space "latest", profile "public") ───────────────────────

export type AppCollection = {
  id: string
  slug: string
  title: string
  topic: BadgeTopic
  cover: string | null
  isPublic: boolean
  /** Real count from collections.links_count (trigger-maintained, chantier 10). */
  linksCount: number
  owner: { name: string; avatar: string | null; username: string }
  /**
   * Up to 4 link-image URLs for the automatic 2×2 mosaic cover, populated only
   * for coverless collections (cover-resolution tier 2). Undefined/empty →
   * the card falls through to the branded Topic scene (tier 3).
   */
  mosaic?: string[]
}

type CollectionRow = {
  id: string
  slug: string
  name: string
  cover_image_url: string | null
  topic_id: string
  is_public: boolean
  links_count: number
  owner:
    | { display_name: string; avatar_url: string | null; username: string }
    | { display_name: string; avatar_url: string | null; username: string }[]
    | null
}

function mapCollection(row: CollectionRow): AppCollection {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    topic: row.topic_id as BadgeTopic,
    cover: row.cover_image_url,
    isPublic: row.is_public,
    linksCount: row.links_count ?? 0,
    owner: {
      name: owner?.display_name ?? '',
      avatar: owner?.avatar_url ?? null,
      username: owner?.username ?? '',
    },
  }
}

/**
 * Attach 2×2 mosaic images to the COVERLESS collections in a list (cover-
 * resolution tier 2). Collections with a custom cover are left untouched; only
 * the coverless ones are looked up, in one batched query. Best-effort — a lookup
 * failure just leaves `mosaic` undefined and the card shows the Topic scene.
 */
async function withMosaics(
  collections: AppCollection[],
): Promise<AppCollection[]> {
  const coverlessIds = collections.filter((c) => !c.cover).map((c) => c.id)
  if (coverlessIds.length === 0) return collections
  const mosaics = await getOwnerCollectionMosaics(coverlessIds)
  return collections.map((c) =>
    c.cover ? c : { ...c, mosaic: mosaics[c.id] },
  )
}

const COLLECTION_SELECT =
  'id, slug, name, cover_image_url, topic_id, is_public, links_count, ' +
  'owner:users!collections_owner_id_fkey (display_name, avatar_url, username)'

/**
 * The signed-in user's own collections, newest first (owner RLS returns both
 * public and private). Empty for a fresh account — the page shows its empty
 * state. `limit` caps the My Space "latest collections" strip.
 */
export async function getMyCollections(
  ownerId: string,
  limit = 12,
): Promise<AppCollection[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_SELECT)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('app: failed to load my collections', {
      message: error.message,
    })
    return []
  }

  return withMosaics(
    ((data ?? []) as unknown as CollectionRow[])
      .filter((row) => isBadgeTopic(row.topic_id))
      .map(mapCollection),
  )
}

/**
 * A visited profile's PUBLIC collections only (§8.10 — private collections and
 * projects are never exposed). RLS enforces this too, but the explicit
 * is_public filter documents intent and keeps the query correct even when the
 * viewer is the owner (who would otherwise see private rows).
 */
export async function getPublicCollectionsByOwner(
  ownerId: string,
  limit = 24,
): Promise<AppCollection[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_SELECT)
    .eq('owner_id', ownerId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('app: failed to load profile collections', {
      message: error.message,
    })
    return []
  }

  return withMosaics(
    ((data ?? []) as unknown as CollectionRow[])
      .filter((row) => isBadgeTopic(row.topic_id))
      .map(mapCollection),
  )
}

// ── Projects (/projects index) ──────────────────────────────────────────────

export type AppProject = {
  id: string
  name: string
  description: string | null
  color: string | null
}

/**
 * The signed-in user's projects, newest first (owner-only RLS — projects are
 * always private, never anon-visible). Read-only this chantier: the /projects
 * index lists what exists; creation/edit and the /projects/[id] detail page land
 * in chantier 10. Empty for a fresh account — the page shows its empty state.
 */
export async function getMyProjects(
  ownerId: string,
  limit = 60,
): Promise<AppProject[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, color')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('app: failed to load projects', { message: error.message })
    return []
  }

  return (data ?? []) as AppProject[]
}

// ── Saved links (/saved) ────────────────────────────────────────────────────

export type SavedLink = {
  id: string
  title: string
  description: string | null
  image: string | null
  urlOrigin: string
  collectionId: string | null
  savedAt: string
  /** Personal free tags (§9). Empty array when none. */
  tags: string[]
  /** Personal categorisation Topic (§9bis), null when uncategorised. */
  topic: BadgeTopic | null
  /** Personal sub-category id + label, null when none chosen. */
  subcategoryId: string | null
  subcategoryLabel: string | null
}

/**
 * One row of the search_saved_links(...) RPC — the joined user_links + canonical
 * link + sub-category label, flattened server-side (see migration 0017).
 */
type SavedLinkRpcRow = {
  id: string
  title_override: string | null
  custom_image_url: string | null
  url_origin: string
  collection_id: string | null
  saved_at: string
  topic_id: string | null
  subcategory_id: string | null
  tags: string[] | null
  link_title: string | null
  link_description: string | null
  link_image_url: string | null
  subcategory_label: string | null
}

function mapSavedLinkRpc(row: SavedLinkRpcRow): SavedLink {
  return {
    id: row.id,
    // Personal display override wins over the canonical title (data model §9).
    title: row.title_override ?? row.link_title ?? row.url_origin,
    description: row.link_description ?? null,
    // Personal custom image overrides the canonical image for this user only.
    image: row.custom_image_url ?? row.link_image_url ?? null,
    urlOrigin: row.url_origin,
    collectionId: row.collection_id,
    savedAt: row.saved_at,
    tags: row.tags ?? [],
    topic: row.topic_id && isBadgeTopic(row.topic_id) ? row.topic_id : null,
    subcategoryId: row.subcategory_id,
    subcategoryLabel: row.subcategory_label ?? null,
  }
}

/** Scope of the /saved search. inbox = Unsorted (collection_id IS NULL). */
export type SavedScope = 'all' | 'inbox' | 'collection'

/** Opaque keyset cursor: the (saved_at, id) of the last item of a page. */
export type SavedCursor = { savedAt: string; id: string }

export type SearchSavedLinksParams = {
  userId: string
  q?: string
  scope?: SavedScope
  topicId?: string | null
  subcategoryId?: string | null
  collectionId?: string | null
  tags?: string[] | null
  cursor?: SavedCursor | null
  /** Page size. The RPC is asked for limit+1 to detect a further page. */
  limit?: number
}

export type SearchSavedLinksResult = {
  items: SavedLink[]
  /** Non-null when a further page exists; pass it back as `cursor`. */
  nextCursor: SavedCursor | null
  /** Server-computed tab counts under the same text + structured filters. */
  counts: { total: number; inbox: number }
}

const SAVED_PAGE_SIZE = 30

/**
 * Server-driven, keyset-paginated search over the user's saves (owner RLS via a
 * SECURITY INVOKER RPC — migration 0017). Replaces the old "fetch newest 60,
 * filter in memory" getSavedLinks: search spans title_override / canonical
 * title / description / tags / url_origin (unaccent-folded), and the result is
 * paginated on (saved_at desc, id desc) with no OFFSET.
 *
 * `counts` is fetched in parallel and reflects the SAME text + structured
 * filters (a search narrows every scope tab, not just the active list), so the
 * Inbox / All tab badges stay honest without the client counting anything.
 *
 * Structured filters and search are independent of `scope`; `counts` is always
 * computed scope-agnostically (total = every match, inbox = matches with no
 * collection) so both tabs read correctly regardless of the active scope.
 */
export async function searchSavedLinks(
  params: SearchSavedLinksParams,
): Promise<SearchSavedLinksResult> {
  const {
    userId,
    q,
    scope = 'inbox',
    topicId = null,
    subcategoryId = null,
    collectionId = null,
    tags = null,
    cursor = null,
    limit = SAVED_PAGE_SIZE,
  } = params

  const supabase = await createClient()
  const normalizedQ = q?.trim() ? q.trim() : null
  const normalizedTags = tags && tags.length > 0 ? tags : null

  // Ask for one more than the page size: its presence signals "has more" and
  // its predecessor supplies the next cursor. We never return the extra row.
  const [listRes, countsRes] = await Promise.all([
    supabase.rpc('search_saved_links', {
      p_user_id: userId,
      p_q: normalizedQ,
      p_scope: scope,
      p_topic_id: topicId,
      p_subcategory_id: subcategoryId,
      p_collection_id: collectionId,
      p_tags: normalizedTags,
      p_cursor_saved_at: cursor?.savedAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit + 1,
    }),
    supabase.rpc('saved_links_counts', {
      p_user_id: userId,
      p_q: normalizedQ,
      p_topic_id: topicId,
      p_subcategory_id: subcategoryId,
      p_tags: normalizedTags,
    }),
  ])

  if (listRes.error) {
    console.error('app: saved search failed', { message: listRes.error.message })
    return { items: [], nextCursor: null, counts: { total: 0, inbox: 0 } }
  }

  const rows = (listRes.data ?? []) as unknown as SavedLinkRpcRow[]
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const items = pageRows.map(mapSavedLinkRpc)

  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? { savedAt: last.savedAt, id: last.id } : null

  // Counts are best-effort: a count failure must not blank the (working) list.
  const countRow = (countsRes.data ?? [])[0] as
    | { total: number | string; inbox: number | string }
    | undefined
  if (countsRes.error) {
    console.error('app: saved counts failed', {
      message: countsRes.error.message,
    })
  }
  const counts = {
    total: Number(countRow?.total ?? items.length),
    inbox: Number(countRow?.inbox ?? 0),
  }

  return { items, nextCursor, counts }
}

// ── Followed curators (My Space "Curators you follow") ──────────────────────

export type FollowedCurator = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  bio: string | null
}

/**
 * Users the signed-in user follows (follows → users). Empty for a fresh account.
 * follows SELECT is public, so this resolves for any authenticated viewer.
 */
export async function getFollowedCurators(
  userId: string,
  limit = 12,
): Promise<FollowedCurator[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .select(
      'followed:users!follows_followed_id_fkey ' +
        '(id, username, display_name, avatar_url, bio)',
    )
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('app: failed to load followed curators', {
      message: error.message,
    })
    return []
  }

  type Row = {
    followed:
      | {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          bio: string | null
        }
      | {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          bio: string | null
        }[]
      | null
  }

  return ((data ?? []) as unknown as Row[])
    .map((row) => (Array.isArray(row.followed) ? row.followed[0] : row.followed))
    .filter((u): u is NonNullable<typeof u> => u != null)
    .map((u) => ({
      id: u.id,
      displayName: u.display_name,
      username: u.username,
      avatarUrl: u.avatar_url,
      bio: u.bio,
    }))
}

// ── Stats (My Space "your universe in numbers", profile header) ─────────────

export type MySpaceStats = {
  savedLinks: number
  collections: number
  curatorsFollowed: number
}

/**
 * My Space counters (§8.9). Real head-counts over the user's own rows — 0 for a
 * fresh account, never a fabricated marketing number. "Likes" is deferred: no
 * like entity is written yet in Phase 3, so it is intentionally omitted rather
 * than shown as a fake 0-that-implies-a-feature.
 */
export async function getMySpaceStats(userId: string): Promise<MySpaceStats> {
  const supabase = await createClient()
  const [savedLinks, collections, curatorsFollowed] = await Promise.all([
    supabase
      .from('user_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ])

  for (const r of [savedLinks, collections, curatorsFollowed]) {
    if (r.error) {
      console.error('app: failed to load my-space stats', {
        message: r.error.message,
      })
    }
  }

  return {
    savedLinks: savedLinks.count ?? 0,
    collections: collections.count ?? 0,
    curatorsFollowed: curatorsFollowed.count ?? 0,
  }
}

// ── Curator analytics (/analytics) ──────────────────────────────────────────

export type AnalyticsTopLink = {
  /** The user_link id (stable key; the row the user owns). */
  id: string
  title: string
  image: string | null
  urlOrigin: string
  /** Canonical shared counter — how many users have saved this link (§9.1). */
  saves: number
}

export type CuratorAnalytics = {
  /** Sum of the canonical saves_count over every link the user has saved. */
  totalSaves: number
  /** Number of canonical links in the user's space (distinct saved links). */
  linkCount: number
  /**
   * Whether canonical click tracking is wired yet. clicks_count exists on links
   * but no click-event source populates it (0004/0012 note): it is a real column
   * stuck at 0 for everyone. `false` lets the page show an honest "not tracked
   * yet" state instead of a fake 0 that implies a working metric — the same rule
   * that omits "Likes" from My Space stats.
   */
  clicksTracked: boolean
  /** Top saved links by canonical saves, most-saved first. */
  topLinks: AnalyticsTopLink[]
}

type AnalyticsLinkRow = {
  id: string
  link_id: string
  title_override: string | null
  custom_image_url: string | null
  url_origin: string
  link:
    | {
        title: string
        image_url: string | null
        saves_count: number
        clicks_count: number
      }
    | {
        title: string
        image_url: string | null
        saves_count: number
        clicks_count: number
      }[]
    | null
}

const ANALYTICS_LINK_SELECT =
  'id, link_id, title_override, custom_image_url, url_origin, ' +
  'link:links!user_links_link_id_fkey (title, image_url, saves_count, clicks_count)'

/**
 * A curator's basic analytics (spec §4.1 "analytics de base", §4.3, §9.1) —
 * pure read, no writes. A curator's canonical Links are the ones they've saved
 * (user_links → links); the saves_count/clicks_count on those links are the
 * SHARED canonical counters (§9.1), so this aggregates the reach of the links in
 * the user's space, not private per-user events.
 *
 * forks_count is omitted from the shape entirely: no fork mechanism exists, so
 * it is 0 for everyone and showing it would imply a feature that does not ship.
 * clicks_count is a real column with no populating source yet (0004/0012), so it
 * is surfaced as `clicksTracked: false` rather than a misleading 0.
 *
 * One query fetches every saved link with its canonical counters; totals and the
 * top-N are computed in-process. No fake seeding — a fresh account reads all 0s
 * and an empty top list, and the page shows its designed empty state.
 */
export async function getCuratorAnalytics(
  userId: string,
  topLimit = 5,
): Promise<CuratorAnalytics> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_links')
    .select(ANALYTICS_LINK_SELECT)
    .eq('user_id', userId)

  if (error) {
    console.error('app: failed to load curator analytics', {
      message: error.message,
    })
    return { totalSaves: 0, linkCount: 0, clicksTracked: false, topLinks: [] }
  }

  const rows = (data ?? []) as unknown as AnalyticsLinkRow[]

  // A user can save the same canonical link into several collections/sections,
  // producing multiple user_links rows for one link. Dedupe by canonical link so
  // its shared saves_count is counted once, not once per personal filing.
  const seen = new Set<string>()
  const links: AnalyticsTopLink[] = []
  let totalSaves = 0

  for (const row of rows) {
    const link = Array.isArray(row.link) ? row.link[0] : row.link
    if (!link) continue
    // Dedupe on the canonical link_id: one user can file the same canonical link
    // into several collections/sections (distinct user_links rows), but its
    // shared saves_count must be counted exactly once.
    if (seen.has(row.link_id)) continue
    seen.add(row.link_id)

    const saves = link.saves_count ?? 0
    totalSaves += saves
    links.push({
      id: row.id,
      title: row.title_override ?? link.title ?? row.url_origin,
      image: row.custom_image_url ?? link.image_url ?? null,
      urlOrigin: row.url_origin,
      saves,
    })
  }

  const topLinks = [...links]
    .sort((a, b) => b.saves - a.saves)
    .slice(0, topLimit)

  return {
    totalSaves,
    linkCount: links.length,
    // No click-event source is wired yet, so clicks_count is 0 for everyone
    // (0004/0012). Report it as untracked rather than a fake metric.
    clicksTracked: false,
    topLinks,
  }
}

// ── Public profile lookup (/profile/[username]) ─────────────────────────────

export type PublicProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  isFoundingCurator: boolean
  createdAt: string
}

export type PublicProfileStats = {
  collections: number
  followers: number
  following: number
}

/**
 * A public profile by username (§8.10) — resolved through the anon-readable
 * users policy, so it works for logged-out visitors and crawlers alike. Returns
 * null when no such username exists (the page then 404s). Only public profile
 * fields are selected (no email — that lives in auth.users).
 */
export async function getProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, username, display_name, avatar_url, bio, location, website_url, ' +
        'is_founding_curator, created_at',
    )
    .eq('username', username)
    .maybeSingle()

  if (error) {
    console.error('app: failed to load profile', { message: error.message })
    return null
  }
  if (!data) return null

  // Runtime-concatenated select string defeats row-shape inference — name it.
  const row = data as unknown as {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    location: string | null
    website_url: string | null
    is_founding_curator: boolean
    created_at: string
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    websiteUrl: row.website_url,
    isFoundingCurator: row.is_founding_curator,
    createdAt: row.created_at,
  }
}

/**
 * Public profile counters (§8.10): public collections, followers, following.
 * followers/following read the public follows graph; collections counts only
 * is_public rows (private collections are never surfaced on a public profile).
 */
export async function getProfileStats(
  userId: string,
): Promise<PublicProfileStats> {
  const supabase = await createClient()
  const [collections, followers, following] = await Promise.all([
    supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_public', true),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ])

  for (const r of [collections, followers, following]) {
    if (r.error) {
      console.error('app: failed to load profile stats', {
        message: r.error.message,
      })
    }
  }

  return {
    collections: collections.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  }
}
