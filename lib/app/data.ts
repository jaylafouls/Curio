import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
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
  owner: { name: string; avatar: string | null; username: string }
}

type CollectionRow = {
  id: string
  slug: string
  name: string
  cover_image_url: string | null
  topic_id: string
  is_public: boolean
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
    owner: {
      name: owner?.display_name ?? '',
      avatar: owner?.avatar_url ?? null,
      username: owner?.username ?? '',
    },
  }
}

const COLLECTION_SELECT =
  'id, slug, name, cover_image_url, topic_id, is_public, ' +
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

  return ((data ?? []) as unknown as CollectionRow[])
    .filter((row) => isBadgeTopic(row.topic_id))
    .map(mapCollection)
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

  return ((data ?? []) as unknown as CollectionRow[])
    .filter((row) => isBadgeTopic(row.topic_id))
    .map(mapCollection)
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
}

type SavedLinkRow = {
  id: string
  title_override: string | null
  custom_image_url: string | null
  url_origin: string
  collection_id: string | null
  saved_at: string
  link:
    | { title: string; description: string | null; image_url: string | null }
    | { title: string; description: string | null; image_url: string | null }[]
    | null
}

function mapSavedLink(row: SavedLinkRow): SavedLink {
  const link = Array.isArray(row.link) ? row.link[0] : row.link
  return {
    id: row.id,
    // Personal display override wins over the canonical title (data model §9).
    title: row.title_override ?? link?.title ?? row.url_origin,
    description: link?.description ?? null,
    // Personal custom image overrides the canonical image for this user only.
    image: row.custom_image_url ?? link?.image_url ?? null,
    urlOrigin: row.url_origin,
    collectionId: row.collection_id,
    savedAt: row.saved_at,
  }
}

const SAVED_LINK_SELECT =
  'id, title_override, custom_image_url, url_origin, collection_id, saved_at, ' +
  'link:links!user_links_link_id_fkey (title, description, image_url)'

/**
 * All of the user's saved links, newest first (owner RLS). `/saved` shows the
 * full set; the "Unsorted" view filters to collection_id IS NULL client-side
 * (both slices come from one query, no second round-trip).
 */
export async function getSavedLinks(
  userId: string,
  limit = 60,
): Promise<SavedLink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_links')
    .select(SAVED_LINK_SELECT)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('app: failed to load saved links', { message: error.message })
    return []
  }

  return ((data ?? []) as unknown as SavedLinkRow[]).map(mapSavedLink)
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
