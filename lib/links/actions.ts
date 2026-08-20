'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeUrl } from './normalize'
import { fetchOgMetadata, type OgMetadata } from './og'
import {
  getInheritedCategory,
  type InheritedCategory,
} from './subcategories'

/**
 * Optional injected identity for the extension transport (chantier 5, Option B).
 *
 * WEB path (identity omitted): userId comes from the session cookie via
 * getUserId(), and user_links writes go through the caller's SESSION client
 * under RLS (auth.uid() = user_id) — unchanged behaviour.
 *
 * EXTENSION path (identity provided): the /api/extension/* route has already
 * resolved a trusted userId from the bearer token, and passes a SERVICE-ROLE
 * client. There is no session, so the user_links write cannot rely on RLS; the
 * route's service-role client bypasses RLS and we set user_id = identity.userId
 * ourselves (the same trust model resolveLink already uses for `links`).
 */
export type ExtensionIdentity = {
  userId: string
  client: ReturnType<typeof createAdminClient>
}

/**
 * Save Flow server actions (chantier 11) — the canonicalization + save pipeline.
 *
 * TWO trust boundaries, deliberately different:
 *
 *  1. resolveLink() canonicalizes into `links`. The `links` table has NO client
 *     insert/update policy (0005 RLS): title/description/image/saves_count are the
 *     canonical, monetisable, cross-user record and MUST NOT be writable by a
 *     browser. So the read-existing / create-new of a canonical Link goes through
 *     the SERVICE-ROLE client — the same pattern as consent_logs (chantier 7):
 *     a trusted server write that bypasses RLS, never reachable from the bundle
 *     (admin.ts is `server-only`). Dedup is by `url_normalized` (unique): if a
 *     canonical Link already exists we REUSE it (never re-fetch OG, never touch
 *     its frozen title/image) and surface its `saves_count` as the "X people
 *     saved this" signal; otherwise we OG-fetch (best-effort) and INSERT one.
 *
 *  2. saveLink() writes `user_links` — the user's PERSONAL relation to the Link.
 *     `user_links` HAS an owner insert policy (auth.uid() = user_id), so this
 *     write goes through the caller's own SESSION client under RLS — no elevated
 *     privilege needed, and the user_id is derived from the session, never
 *     trusted from the client. The saves_count / links_count triggers (0004/0010)
 *     maintain the denormalised counters automatically.
 *
 * Result shape mirrors the other actions: `{ ok: true, ... }` | `{ ok: false,
 * error: code }` so the client localises the message.
 */

type Err = 'unauthenticated' | 'invalid' | 'invalid_url' | 'server' | 'not_found'
type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: Err }

const TITLE_MAX = 100 // links.title / user_links.title_override (data model §8/§9)
const DESC_MAX = 300 // links.description
const NOTE_MAX = 500 // user_links.note
const TAG_MAX = 40 // per-tag length cap (defensive; tags are free text)
const TAGS_MAX = 20 // number of tags cap

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Trim + hard-cap a string; empty → null. */
function clip(input: unknown, max: number): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t.length === 0) return null
  return t.length > max ? t.slice(0, max) : t
}

/**
 * Only accept a custom image URL that points at our own public Storage bucket
 * (user-images) — never an arbitrary external URL (open image-embed vector; also
 * would not match next.config remotePatterns). Empty/undefined → null.
 */
function cleanCustomImage(input: unknown): string | null {
  if (typeof input !== 'string' || input === '') return null
  if (!input.includes('/storage/v1/object/public/user-images/')) return null
  return input
}

// ── resolveLink — canonicalize into `links` (service-role) ──────────────────

export type ResolveLinkResult = {
  linkId: string
  /** Canonical (frozen) metadata to prefill the Customize step. */
  title: string
  description: string | null
  image: string | null
  /** Canonical favicon URL, or null when none was found. */
  favicon: string | null
  /** True when this canonical Link already existed (dedup hit). */
  existing: boolean
  /** How many users have saved this canonical Link (the "X people saved" signal). */
  savesCount: number
}

/**
 * A readable last-resort title from a normalized URL when the OG fetch found no
 * real title (403, timeout, JS-only shell, non-HTML). "https://example.com/a/b?x"
 * → "example.com/a/b" — the host + decoded path, far more legible than the full
 * normalized URL. Truncated to the title cap. Rows built from this are flagged
 * `title_is_fallback` so a later save can re-fetch and upgrade them.
 */
function readableFallbackTitle(normalized: string): string {
  let readable = normalized
  try {
    const u = new URL(normalized)
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, '')
    readable = `${u.host}${path}${u.search}`
  } catch {
    // Keep the normalized string as-is if it somehow doesn't parse.
  }
  return readable.slice(0, TITLE_MAX)
}

/**
 * Turn a best-effort OG fetch into the canonical fields to persist. When the OG
 * title is missing we fall back to a readable URL title AND flag the row degraded
 * (titleIsFallback) so resolveLink can re-fetch it on a later save. A real OG
 * title clears the flag.
 */
function canonicalFieldsFromOg(
  og: OgMetadata,
  normalized: string,
): {
  title: string
  description: string | null
  image: string | null
  favicon: string | null
  titleIsFallback: boolean
} {
  const ogTitle = clip(og.title, TITLE_MAX)
  const titleIsFallback = ogTitle === null
  const title = ogTitle ?? readableFallbackTitle(normalized)
  const description = clip(og.description, DESC_MAX)
  // Only trust an http(s) image URL from the fetch (parseOg already absolutised
  // it); a data: or junk value is dropped.
  const image = og.image && /^https?:\/\//i.test(og.image) ? og.image : null
  const favicon =
    og.favicon && /^https?:\/\//i.test(og.favicon) ? og.favicon : null
  return { title, description, image, favicon, titleIsFallback }
}

/**
 * Normalize `rawUrl`, then find-or-create the canonical Link for it.
 *  - Dedup HIT  → return the stored (frozen) metadata + saves_count, existing:true.
 *                 No OG re-fetch; the canonical record is authoritative.
 *  - Dedup MISS → OG-fetch best-effort (title falls back to the URL on failure),
 *                 INSERT a canonical row, return it with existing:false, saves 0.
 * Never fails the flow on an OG problem — only a bad URL or a DB error errors out.
 */
export async function resolveLink(
  rawUrl: string,
  identity?: ExtensionIdentity,
): Promise<Result<ResolveLinkResult>> {
  const userId = identity?.userId ?? (await getUserId())
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const normalized = normalizeUrl(rawUrl)
  if (!normalized) return { ok: false, error: 'invalid_url' }

  // `links` is service-role-only on both paths; the extension's injected client
  // is already service-role, so either admin client works identically here.
  const admin = createAdminClient()

  const CANONICAL_SELECT =
    'id, title, description, image_url, favicon_url, saves_count, title_is_fallback'

  // 1. Dedup lookup by the unique canonicalization key.
  const { data: found, error: findErr } = await admin
    .from('links')
    .select(CANONICAL_SELECT)
    .eq('url_normalized', normalized)
    .maybeSingle()

  if (findErr) {
    console.error('resolveLink: lookup failed', { message: findErr.message })
    return { ok: false, error: 'server' }
  }

  if (found) {
    const row = found as unknown as CanonicalLinkRow
    // Scoped conditional re-fetch: the canonical title is normally frozen (never
    // re-fetched), but when it is only the URL fallback (title_is_fallback) a
    // later save gets one chance to fetch a real title and upgrade the row in
    // place — the fix for "the title stays the URL forever" when the FIRST save
    // degraded. Healthy rows (flag false) are never re-fetched.
    if (row.title_is_fallback) {
      const upgraded = await tryUpgradeDegradedLink(admin, row, normalized)
      return { ok: true, ...canonicalResult(upgraded, true) }
    }
    return { ok: true, ...canonicalResult(row, true) }
  }

  // 2. New canonical Link: best-effort OG fetch, then insert.
  const og = await fetchOgMetadata(normalized)
  const fields = canonicalFieldsFromOg(og, normalized)

  const { data: inserted, error: insErr } = await admin
    .from('links')
    .insert({
      url_normalized: normalized,
      url_first_origin: rawUrl.trim().slice(0, 2048),
      title: fields.title,
      description: fields.description,
      image_url: fields.image,
      favicon_url: fields.favicon,
      title_is_fallback: fields.titleIsFallback,
    })
    .select(CANONICAL_SELECT)
    .single()

  if (insErr || !inserted) {
    // A concurrent save of the same URL could have inserted it between our
    // lookup and insert (unique violation on url_normalized). Re-read once so the
    // user still gets a canonical Link rather than an error.
    const { data: race } = await admin
      .from('links')
      .select(CANONICAL_SELECT)
      .eq('url_normalized', normalized)
      .maybeSingle()
    if (race) {
      return { ok: true, ...canonicalResult(race as unknown as CanonicalLinkRow, true) }
    }
    console.error('resolveLink: insert failed', { message: insErr?.message })
    return { ok: false, error: 'server' }
  }

  return {
    ok: true,
    ...canonicalResult(inserted as unknown as CanonicalLinkRow, false),
  }
}

/** The canonical `links` columns resolveLink reads/returns. */
type CanonicalLinkRow = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  favicon_url: string | null
  saves_count: number | null
  title_is_fallback: boolean
}

/** Shape a canonical row into the ResolveLinkResult payload. */
function canonicalResult(
  row: CanonicalLinkRow,
  existing: boolean,
): Omit<ResolveLinkResult, never> {
  return {
    linkId: row.id,
    title: row.title,
    description: row.description ?? null,
    image: row.image_url ?? null,
    favicon: row.favicon_url ?? null,
    existing,
    savesCount: row.saves_count ?? 0,
  }
}

/**
 * One re-fetch attempt for a canonical Link whose title is still the URL
 * fallback. If the OG fetch now yields a real title, upgrade the row in place
 * (title + description + image + favicon, clearing the flag) and return the
 * upgraded row; otherwise return the row unchanged (still flagged, so the next
 * save can try again). Never throws — a failed upgrade just leaves the row as-is.
 */
async function tryUpgradeDegradedLink(
  admin: ReturnType<typeof createAdminClient>,
  row: CanonicalLinkRow,
  normalized: string,
): Promise<CanonicalLinkRow> {
  const og = await fetchOgMetadata(normalized)
  const fields = canonicalFieldsFromOg(og, normalized)
  // Still no real title — nothing to upgrade, keep the row flagged.
  if (fields.titleIsFallback) return row

  const { data: updated, error: updErr } = await admin
    .from('links')
    .update({
      title: fields.title,
      description: fields.description ?? row.description,
      image_url: fields.image ?? row.image_url,
      favicon_url: fields.favicon ?? row.favicon_url,
      title_is_fallback: false,
    })
    .eq('id', row.id)
    // Only upgrade a row that is still flagged, so a concurrent upgrade doesn't
    // clobber a freshly-written real title.
    .eq('title_is_fallback', true)
    .select(
      'id, title, description, image_url, favicon_url, saves_count, title_is_fallback',
    )
    .maybeSingle()

  if (updErr || !updated) {
    // Update lost a race or errored — return what we have (the freshly fetched
    // title is still the best value to surface for this save).
    return {
      ...row,
      title: fields.title,
      description: fields.description ?? row.description,
      image_url: fields.image ?? row.image_url,
      favicon_url: fields.favicon ?? row.favicon_url,
      title_is_fallback: false,
    }
  }
  return updated as unknown as CanonicalLinkRow
}

// ── saveLink — write `user_links` (caller's session, RLS) ───────────────────

export type SaveLinkInput = {
  linkId: string
  /** Raw URL this user saved (kept per-user with its own tracking, data model §9). */
  urlOrigin: string
  /** Target collection, or null for Unsorted. */
  collectionId?: string | null
  /** Target section (must belong to collectionId), or null for Unsectioned. */
  sectionId?: string | null
  /** Personal display title override (≤100), else the canonical title shows. */
  titleOverride?: string | null
  /** Private note (≤500). */
  note?: string | null
  /** Free tags. */
  tags?: string[] | null
  /** Personal image (public URL in the user-images bucket), overrides canonical. */
  customImageUrl?: string | null
  /**
   * Categorisation Topic (data model §9bis / Decisions Log §18). Required when
   * saving to Unsorted (collectionId null); inside a Collection the Topic is
   * inherited from the Collection when omitted. Personal, never canonical.
   */
  topicId?: string | null
  /**
   * Optional sub-category refining the Topic. Only Travel/Food define any; where
   * a Topic defines sub-categories the Save Flow makes one mandatory ("Autre" is
   * always available). Must belong to `topicId` — validated below (Model B, no
   * DB trigger).
   */
  subcategoryId?: string | null
}

export type SaveLinkResult = {
  userLinkId: string
  /** Slug of the target collection (for the "View in collection" CTA), or null. */
  collectionSlug: string | null
  /** Name of the target collection, or null for Unsorted. */
  collectionName: string | null
}

/**
 * Persist the user's personal save of an already-resolved canonical Link. Runs
 * under the caller's session (user_links insert-owner RLS). Validates that a
 * given collection/section is actually owned by the caller (the section-coherence
 * DB trigger is a second line of defence, but we check here for a clean error and
 * to resolve the collection slug/name for the confirmation CTA).
 */
export async function saveLink(
  input: SaveLinkInput,
  identity?: ExtensionIdentity,
): Promise<Result<SaveLinkResult>> {
  const userId = identity?.userId ?? (await getUserId())
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!input.linkId || typeof input.linkId !== 'string') {
    return { ok: false, error: 'invalid' }
  }

  // WEB: session client under RLS. EXTENSION: injected service-role client — we
  // set user_id = userId explicitly below (RLS is bypassed, so the caller's
  // token-resolved identity is the authority, exactly as for `links`). The
  // ownership checks on collection/section still scope by owner_id = userId, so
  // a token can only save into collections the token's owner actually owns.
  const supabase = identity?.client ?? (await createClient())

  // Resolve + authorize the target collection (if any). We also read the
  // collection's topic_id so a save into a Collection can inherit its Topic when
  // the caller doesn't override it (Save Flow prefills, but the server is the
  // authority — an omitted topicId in a Collection means "use the Collection's").
  let collectionId: string | null = null
  let collectionSlug: string | null = null
  let collectionName: string | null = null
  let collectionTopicId: string | null = null
  if (input.collectionId) {
    const { data: coll } = await supabase
      .from('collections')
      .select('id, slug, name, topic_id')
      .eq('id', input.collectionId)
      .eq('owner_id', userId)
      .maybeSingle()
    if (!coll) return { ok: false, error: 'not_found' }
    collectionId = coll.id
    collectionSlug = coll.slug
    collectionName = coll.name
    collectionTopicId = coll.topic_id ?? null
  }

  // Section only valid inside the chosen collection (the DB trigger enforces this
  // too; we pre-check so a mismatched section returns a clean error, not a 500).
  let sectionId: string | null = null
  if (input.sectionId) {
    if (!collectionId) return { ok: false, error: 'invalid' }
    const { data: sec } = await supabase
      .from('sections')
      .select('id')
      .eq('id', input.sectionId)
      .eq('collection_id', collectionId)
      .maybeSingle()
    if (!sec) return { ok: false, error: 'invalid' }
    sectionId = sec.id
  }

  // Sanitise tags: trim, drop blanks, dedup case-insensitively, cap count+length.
  const tags = Array.isArray(input.tags)
    ? Array.from(
        new Map(
          input.tags
            .map((t) => (typeof t === 'string' ? t.trim() : ''))
            .filter((t) => t.length > 0)
            .map((t) => t.slice(0, TAG_MAX))
            .map((t) => [t.toLowerCase(), t] as const),
        ).values(),
      ).slice(0, TAGS_MAX)
    : []

  // Per-user raw URL kept with its own tracking (data model §9, NOT NULL).
  const urlOrigin = clip(input.urlOrigin, 2048)
  if (!urlOrigin) return { ok: false, error: 'invalid' }

  // ── Categorisation (Topic + optional sub-category), §18 / Model B ──────────
  // Resolve the effective Topic: an explicit input wins; otherwise a save into a
  // Collection inherits the Collection's Topic. Unsorted saves have no Collection
  // to inherit from, so a Topic is mandatory there.
  const topicId = clip(input.topicId, 64) ?? collectionTopicId
  if (!collectionId && !topicId) {
    // Save to Unsorted without a Topic — the Save Flow requires one (§18.2).
    return { ok: false, error: 'invalid' }
  }

  // A sub-category is only meaningful with a Topic, and must belong to it. We
  // validate coherence here (no DB trigger, Model B): the sub-category row must
  // exist AND its topic_id must equal the resolved Topic. This is the single
  // enforcement point for "subcategory.topic_id === topicId".
  let subcategoryId: string | null = null
  if (input.subcategoryId) {
    if (!topicId) return { ok: false, error: 'invalid' }
    const { data: sub } = await supabase
      .from('link_subcategories')
      .select('id, topic_id')
      .eq('id', input.subcategoryId)
      .maybeSingle()
    if (!sub || sub.topic_id !== topicId) return { ok: false, error: 'invalid' }
    subcategoryId = sub.id
  }

  const { data, error } = await supabase
    .from('user_links')
    .insert({
      user_id: userId,
      link_id: input.linkId,
      collection_id: collectionId,
      section_id: sectionId,
      title_override: clip(input.titleOverride, TITLE_MAX),
      note: clip(input.note, NOTE_MAX),
      tags: tags.length > 0 ? tags : null,
      custom_image_url: cleanCustomImage(input.customImageUrl),
      url_origin: urlOrigin,
      topic_id: topicId,
      subcategory_id: subcategoryId,
    })
    .select('id')
    .single()

  if (error || !data) {
    // link_id must reference an existing canonical Link (resolveLink guarantees
    // it); a foreign-key / trigger error surfaces as a server error here.
    console.error('saveLink: insert failed', { message: error?.message })
    return { ok: false, error: 'server' }
  }

  // Refresh the surfaces that show the new save.
  revalidatePath('/[locale]/saved', 'page')
  revalidatePath('/[locale]/my-space', 'page')
  if (collectionSlug) {
    revalidatePath(`/[locale]/collections/${collectionSlug}`, 'page')
  }

  return {
    ok: true,
    userLinkId: data.id,
    collectionSlug,
    collectionName,
  }
}

// ── suggestInheritedCategory — prefill the Save Flow (cross-user inheritance) ──

/**
 * Server action for the Save Flow: the most-recent categorisation of this
 * canonical link by ANY user, used to prefill the Topic/sub-category pickers
 * (§18 cross-user inheritance — if someone already filed this exact link under a
 * Topic, that pre-fills the next saver's choice). Only reference-table
 * topic_id/subcategory_id crosses users, never who filed it or private content.
 *
 * Still session-gated (must be authenticated to call the Save Flow), but the read
 * itself is not scoped to the caller. Returns nulls when no one has categorised
 * this link before.
 */
export async function suggestInheritedCategory(
  linkId: string,
): Promise<Result<{ suggestion: InheritedCategory }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!linkId || typeof linkId !== 'string') {
    return { ok: false, error: 'invalid' }
  }
  const suggestion = await getInheritedCategory(linkId)
  return { ok: true, suggestion }
}
