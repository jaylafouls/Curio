import { cache } from 'react'
import {
  createClient as createAnonClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireSupabaseEnv } from '@/lib/supabase/env'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'

/**
 * Collection DETAIL reads (chantier 10) for /collections/[id].
 *
 * Two distinct entry points, matching the page's two audiences:
 *
 *  - getPublicCollectionBySlug — ANON client, resolves ONLY public collections
 *    by slug. This is the crawler / logged-out path that the ISR page renders,
 *    so the cached HTML contains exactly the anonymous-visible slice (no private
 *    note, no private sections/links). RLS enforces it; the is_public filter
 *    documents intent.
 *
 *  - getOwnerCollection — AUTHENTICATED session client, resolves a collection
 *    the caller OWNS (public or private), including the private note and every
 *    section/link. Feeds the owner overlay, fetched client-side after hydration
 *    so it never contaminates the public ISR cache. Returns null if the caller
 *    is not the owner (or not signed in), which the overlay treats as "no owner
 *    controls".
 */

function anonClient() {
  const { url, anonKey } = requireSupabaseEnv()
  return createAnonClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

// ── Shared shapes ───────────────────────────────────────────────────────────

export type CollectionLink = {
  /** user_links.id (the personal row, stable key for the card). */
  id: string
  title: string
  description: string | null
  image: string | null
  urlOrigin: string
  sectionId: string | null
  savedAt: string
  /** Whether the underlying canonical link is a sponsored placement (badge). */
  isSponsored: boolean
  latitude: number | null
  longitude: number | null
}

export type CollectionSection = {
  id: string
  name: string
  order: number
}

export type CollectionDetail = {
  id: string
  slug: string
  title: string
  description: string | null
  /** Owner's private note — only ever populated on the owner read. */
  note: string | null
  topic: BadgeTopic
  cover: string | null
  isPublic: boolean
  linksCount: number
  owner: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  sections: CollectionSection[]
  links: CollectionLink[]
  /** True when the current session owns this collection (owner read only). */
  isOwner: boolean
}

type CollectionRow = {
  id: string
  slug: string
  name: string
  description: string | null
  note: string | null
  topic_id: string
  cover_image_url: string | null
  is_public: boolean
  links_count: number
  owner_id: string
  owner:
    | { display_name: string; username: string; avatar_url: string | null }
    | { display_name: string; username: string; avatar_url: string | null }[]
    | null
}

type SectionRow = { id: string; name: string; order: number }

type LinkRow = {
  id: string
  title_override: string | null
  custom_image_url: string | null
  url_origin: string
  section_id: string | null
  saved_at: string
  link:
    | {
        title: string
        description: string | null
        image_url: string | null
        is_sponsored: boolean
        latitude: number | null
        longitude: number | null
      }
    | {
        title: string
        description: string | null
        image_url: string | null
        is_sponsored: boolean
        latitude: number | null
        longitude: number | null
      }[]
    | null
}

const COLLECTION_SELECT =
  'id, slug, name, description, note, topic_id, cover_image_url, is_public, ' +
  'links_count, owner_id, ' +
  'owner:users!collections_owner_id_fkey (display_name, username, avatar_url)'

const LINK_SELECT =
  'id, title_override, custom_image_url, url_origin, section_id, saved_at, ' +
  'link:links!user_links_link_id_fkey ' +
  '(title, description, image_url, is_sponsored, latitude, longitude)'

function mapSection(row: SectionRow): CollectionSection {
  return { id: row.id, name: row.name, order: row.order }
}

function mapLink(row: LinkRow): CollectionLink {
  const link = Array.isArray(row.link) ? row.link[0] : row.link
  return {
    id: row.id,
    // Personal display override wins over the canonical title (data model §9).
    title: row.title_override ?? link?.title ?? row.url_origin,
    description: link?.description ?? null,
    // Personal custom image overrides the canonical image for this user only.
    image: row.custom_image_url ?? link?.image_url ?? null,
    urlOrigin: row.url_origin,
    sectionId: row.section_id,
    savedAt: row.saved_at,
    isSponsored: link?.is_sponsored ?? false,
    latitude: link?.latitude ?? null,
    longitude: link?.longitude ?? null,
  }
}

// ── Public read (anon, ISR / crawler path) ──────────────────────────────────

/**
 * A PUBLIC collection by slug, with its sections and public links, read through
 * the anon client. Returns null for a non-existent or private slug (the page
 * 404s). Cached per request so metadata + body share one round-trip.
 */
export const getPublicCollectionBySlug = cache(
  async (slug: string): Promise<CollectionDetail | null> => {
    const supabase = anonClient()

    const { data, error } = await supabase
      .from('collections')
      .select(COLLECTION_SELECT)
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle()

    if (error) {
      console.error('collections: public read failed', { message: error.message })
      return null
    }
    if (!data) return null

    const row = data as unknown as CollectionRow
    if (!isBadgeTopic(row.topic_id)) return null

    // Sections + links: anon RLS returns sections of a public collection and
    // user_links that sit in a public collection (0005 policies). Run parallel.
    const [sectionsRes, linksRes] = await Promise.all([
      supabase
        .from('sections')
        .select('id, name, order:"order"')
        .eq('collection_id', row.id)
        .order('order', { ascending: true }),
      supabase
        .from('user_links')
        .select(LINK_SELECT)
        .eq('collection_id', row.id)
        .order('saved_at', { ascending: false }),
    ])

    if (sectionsRes.error) {
      console.error('collections: public sections read failed', {
        message: sectionsRes.error.message,
      })
    }
    if (linksRes.error) {
      console.error('collections: public links read failed', {
        message: linksRes.error.message,
      })
    }

    return buildDetail(row, sectionsRes.data, linksRes.data, false)
  },
)

// ── Owner read (session, owner overlay) ─────────────────────────────────────

/**
 * A collection the CURRENT SESSION owns, by id — public or private, including
 * the private note and every section/link. Returns null when unauthenticated or
 * not the owner. Fetched client-side by the owner overlay so it never enters the
 * public ISR cache.
 */
export async function getOwnerCollectionById(
  collectionId: string,
): Promise<CollectionDetail | null> {
  return ownerRead('id', collectionId)
}

/**
 * Same owner-scoped read, keyed by slug — the fallback the collection page uses
 * when the anon/public read misses (a PRIVATE collection the owner is viewing at
 * its own URL). Returns null unless the caller owns it.
 */
export async function getOwnerCollectionBySlug(
  slug: string,
): Promise<CollectionDetail | null> {
  return ownerRead('slug', slug)
}

async function ownerRead(
  key: 'id' | 'slug',
  value: string,
): Promise<CollectionDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_SELECT)
    .eq(key, value)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('collections: owner read failed', { message: error.message })
    return null
  }
  if (!data) return null

  const row = data as unknown as CollectionRow
  if (!isBadgeTopic(row.topic_id)) return null

  const [sectionsRes, linksRes] = await Promise.all([
    supabase
      .from('sections')
      .select('id, name, order:"order"')
      .eq('collection_id', row.id)
      .order('order', { ascending: true }),
    supabase
      .from('user_links')
      .select(LINK_SELECT)
      .eq('collection_id', row.id)
      .order('saved_at', { ascending: false }),
  ])

  if (sectionsRes.error) {
    console.error('collections: owner sections read failed', {
      message: sectionsRes.error.message,
    })
  }
  if (linksRes.error) {
    console.error('collections: owner links read failed', {
      message: linksRes.error.message,
    })
  }

  return buildDetail(row, sectionsRes.data, linksRes.data, true)
}

function buildDetail(
  row: CollectionRow,
  sections: unknown,
  links: unknown,
  isOwner: boolean,
): CollectionDetail {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    description: row.description,
    // Note is private — only surfaced on the owner read.
    note: isOwner ? row.note : null,
    topic: row.topic_id as BadgeTopic,
    cover: row.cover_image_url,
    isPublic: row.is_public,
    linksCount: row.links_count,
    owner: {
      id: row.owner_id,
      name: owner?.display_name ?? '',
      username: owner?.username ?? '',
      avatar: owner?.avatar_url ?? null,
    },
    sections: ((sections ?? []) as SectionRow[]).map(mapSection),
    links: ((links ?? []) as unknown as LinkRow[]).map(mapLink),
    isOwner,
  }
}

// ── Cover mosaics (card cover-resolution tier 2) ────────────────────────────

/**
 * For a set of collection ids, return up to `perCollection` link-image URLs each
 * — the material for the automatic 2×2 mosaic cover a coverless collection card
 * shows (recette point 5, tier 2). One batched query for the whole grid instead
 * of an N+1 per card.
 *
 * The caller passes its OWN Supabase client so the read stays in that surface's
 * RLS context: the anon client for public grids (Explore, Home, profile), the
 * session client for My Space. RLS already scopes user_links to what the caller
 * may see, so a private link never leaks into a public card's mosaic.
 *
 * The image is the personal custom image when set, else the canonical link image
 * (data model §9), matching how the detail body renders each link. Rows with no
 * image are skipped; collections that end up with zero images simply aren't in
 * the returned map and the card falls through to the branded Topic scene.
 */
export async function getCollectionMosaics(
  supabase: SupabaseClient,
  collectionIds: string[],
  perCollection = 4,
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  const ids = collectionIds.filter(Boolean)
  if (ids.length === 0) return out

  const { data, error } = await supabase
    .from('user_links')
    .select(
      'collection_id, custom_image_url, saved_at, ' +
        'link:links!user_links_link_id_fkey (image_url)',
    )
    .in('collection_id', ids)
    .order('saved_at', { ascending: false })

  if (error) {
    console.error('collections: mosaic read failed', { message: error.message })
    return out
  }

  type Row = {
    collection_id: string | null
    custom_image_url: string | null
    link: { image_url: string | null } | { image_url: string | null }[] | null
  }

  for (const row of (data ?? []) as unknown as Row[]) {
    const cid = row.collection_id
    if (!cid) continue
    if ((out[cid]?.length ?? 0) >= perCollection) continue
    const link = Array.isArray(row.link) ? row.link[0] : row.link
    const image = row.custom_image_url ?? link?.image_url ?? null
    if (!image) continue
    ;(out[cid] ??= []).push(image)
  }

  return out
}

/** Convenience wrapper for public/anon surfaces (Explore, Home, profile). */
export async function getPublicCollectionMosaics(
  collectionIds: string[],
): Promise<Record<string, string[]>> {
  return getCollectionMosaics(anonClient(), collectionIds)
}

/** Convenience wrapper for the signed-in My Space grid (session RLS). */
export async function getOwnerCollectionMosaics(
  collectionIds: string[],
): Promise<Record<string, string[]>> {
  const supabase = await createClient()
  return getCollectionMosaics(supabase, collectionIds)
}
