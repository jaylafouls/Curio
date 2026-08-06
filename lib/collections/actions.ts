'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { emitNotification } from '@/lib/notifications/emit'
import { BADGE_TOPICS } from '@/components/ui'
import {
  getOwnerCollectionById,
  getOwnerCollectionBySlug,
  type CollectionDetail,
} from './data'

/**
 * Collection Server Actions (chantier 10) — create + edit, plus section and
 * public-toggle management.
 *
 * All run authenticated; each re-derives the user from the session (never trusts
 * a client id) and writes through RLS with the caller's session. Inputs are
 * validated against the data-model constraints server-side (the client is
 * untrusted). Shape mirrors the onboarding actions: `{ ok: true, ... }` or
 * `{ ok: false, error: code }` so the client can localize the message.
 *
 * Section suggestions are a static config (lib/collections/sections.ts); the
 * chosen names are passed in and inserted as real sections rows. Cover uploads
 * happen client-side straight to Storage (owner-scoped RLS) — only the resulting
 * public URL reaches these actions, so no binary passes through the server.
 */

type Err = 'unauthenticated' | 'invalid' | 'server' | 'not_found'
type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: Err }

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

const NAME_MAX = 100
const DESC_MAX = 300 // links have 300; collection description is free text — cap same
const NOTE_MAX = 500 // data model §6

function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t.length < 1 || t.length > NAME_MAX) return null
  return t
}

function cleanOptional(input: unknown, max: number): string | null | undefined {
  if (input === undefined) return undefined // "leave unchanged"
  if (input === null) return null
  if (typeof input !== 'string') return undefined
  const t = input.trim()
  if (t.length === 0) return null
  if (t.length > max) return t.slice(0, max)
  return t
}

/**
 * Only allow a cover URL that points at our own public Storage bucket — never an
 * arbitrary external URL (which would be an open image-embed vector and would
 * also not match next.config's remotePatterns). Empty/undefined leaves it unset.
 */
function cleanCoverUrl(input: unknown): string | null | undefined {
  if (input === undefined) return undefined
  if (input === null || input === '') return null
  if (typeof input !== 'string') return undefined
  if (!input.includes('/storage/v1/object/public/collection-covers/')) {
    return undefined
  }
  return input
}

export type CreateCollectionInput = {
  name: string
  topicId: string
  description?: string | null
  note?: string | null
  coverUrl?: string | null
  projectId?: string | null
  /** Section names to seed (from suggestions or hand-typed). Order = array order. */
  sections?: string[]
}

/**
 * Create a collection owned by the caller, optionally inside a project, with an
 * initial set of sections. New collections default to PRIVATE (is_public=false,
 * DB default) — publishing is an explicit toggle in edit (spec: a collection is
 * a showcase only once made public). Returns the new id + slug so the client can
 * navigate to it.
 */
export async function createCollection(
  input: CreateCollectionInput,
): Promise<Result<{ id: string; slug: string }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const name = cleanName(input.name)
  if (!name) return { ok: false, error: 'invalid' }
  if (!(BADGE_TOPICS as readonly string[]).includes(input.topicId)) {
    return { ok: false, error: 'invalid' }
  }
  const description = cleanOptional(input.description, DESC_MAX) ?? null
  const note = cleanOptional(input.note, NOTE_MAX) ?? null
  const coverUrl = cleanCoverUrl(input.coverUrl) ?? null

  const supabase = await createClient()

  // If a projectId is given, it must be one the caller owns (RLS would also
  // reject, but validate for a clean error). null = standalone.
  let projectId: string | null = null
  if (input.projectId) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', input.projectId)
      .eq('owner_id', userId)
      .maybeSingle()
    if (!proj) return { ok: false, error: 'invalid' }
    projectId = proj.id
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      owner_id: userId,
      topic_id: input.topicId,
      name,
      description,
      note,
      cover_image_url: coverUrl,
      project_id: projectId,
      // is_public omitted → DB default false (private on creation).
    })
    .select('id, slug')
    .single()

  if (error || !data) {
    console.error('createCollection: insert failed', { message: error?.message })
    return { ok: false, error: 'server' }
  }

  // Seed sections in order (dedup + skip blanks). Best-effort: a section failure
  // does not roll back the collection — the user can add sections later.
  const sectionNames = Array.from(
    new Set(
      (input.sections ?? [])
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0 && s.length <= NAME_MAX),
    ),
  )
  if (sectionNames.length > 0) {
    const rows = sectionNames.map((sname, i) => ({
      collection_id: data.id,
      name: sname,
      order: i,
    }))
    const { error: secErr } = await supabase.from('sections').insert(rows)
    if (secErr) {
      console.error('createCollection: sections insert failed', {
        message: secErr.message,
      })
    }
  }

  revalidatePath('/[locale]/my-space', 'page')
  return { ok: true, id: data.id, slug: data.slug }
}

export type UpdateCollectionInput = {
  id: string
  name?: string
  description?: string | null
  note?: string | null
  coverUrl?: string | null
  isPublic?: boolean
  projectId?: string | null
}

/**
 * Edit a collection the caller owns. Only provided fields change (undefined =
 * leave as-is). The public toggle lives here (edit-only, per spec). Does NOT
 * touch the slug — an existing slug is a stable public URL (brief rule 1); the
 * DB trigger only reslugs when slug is explicitly cleared, which we never do.
 */
export async function updateCollection(
  input: UpdateCollectionInput,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!input.id) return { ok: false, error: 'invalid' }

  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = cleanName(input.name)
    if (!name) return { ok: false, error: 'invalid' }
    patch.name = name
  }
  const description = cleanOptional(input.description, DESC_MAX)
  if (description !== undefined) patch.description = description
  const note = cleanOptional(input.note, NOTE_MAX)
  if (note !== undefined) patch.note = note
  const coverUrl = cleanCoverUrl(input.coverUrl)
  if (coverUrl !== undefined) patch.cover_image_url = coverUrl
  if (typeof input.isPublic === 'boolean') patch.is_public = input.isPublic
  if (input.projectId !== undefined) patch.project_id = input.projectId

  if (Object.keys(patch).length === 0) return { ok: true }

  const supabase = await createClient()

  // If moving into a project, verify ownership of the target project.
  if (typeof patch.project_id === 'string') {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', patch.project_id)
      .eq('owner_id', userId)
      .maybeSingle()
    if (!proj) return { ok: false, error: 'invalid' }
  }

  const { data, error } = await supabase
    .from('collections')
    .update(patch)
    .eq('id', input.id)
    .eq('owner_id', userId)
    .select('slug')
    .maybeSingle()

  if (error) {
    console.error('updateCollection: update failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  if (!data) return { ok: false, error: 'not_found' }

  revalidatePath('/[locale]/my-space', 'page')
  revalidatePath(`/[locale]/collections/${data.slug}`, 'page')
  return { ok: true }
}

/**
 * Owner detail fetch as a Server Action, so the collection page's client owner
 * overlay can pull the private, owner-scoped view (note, private sections/links,
 * is_public) AFTER hydration — keeping it out of the public ISR cache. Returns
 * null when the caller doesn't own the collection (→ overlay shows nothing).
 */
export async function fetchOwnerCollection(
  collectionId: string,
): Promise<CollectionDetail | null> {
  return getOwnerCollectionById(collectionId)
}

/**
 * Owner detail by slug, as a Server Action — the collection page's private
 * fallback client uses this when the public read missed (a private collection
 * the owner is viewing at its own URL). Null when the caller doesn't own it.
 */
export async function fetchOwnerCollectionBySlug(
  slug: string,
): Promise<CollectionDetail | null> {
  return getOwnerCollectionBySlug(slug)
}

/** Add a section to an owned collection (returns the new section id + order). */
export async function addSection(
  collectionId: string,
  name: string,
): Promise<Result<{ id: string }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  const clean = cleanName(name)
  if (!collectionId || !clean) return { ok: false, error: 'invalid' }

  const supabase = await createClient()

  // Ownership check + next order value (append to the end).
  const { data: coll } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (!coll) return { ok: false, error: 'not_found' }

  const { count } = await supabase
    .from('sections')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', collectionId)

  const { data, error } = await supabase
    .from('sections')
    .insert({ collection_id: collectionId, name: clean, order: count ?? 0 })
    .select('id')
    .single()

  if (error || !data) {
    console.error('addSection: insert failed', { message: error?.message })
    return { ok: false, error: 'server' }
  }
  return { ok: true, id: data.id }
}

/** Delete a section from an owned collection (its links fall back to Unsectioned
 *  via the section_id ON DELETE SET NULL FK). */
export async function deleteSection(sectionId: string): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!sectionId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()

  // RLS (sections_write_via_collection_owner) already restricts to the owner's
  // sections; the delete is a no-op for anyone else.
  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', sectionId)
  if (error) {
    console.error('deleteSection: delete failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}

/** Delete a collection the caller owns. Its user_links keep existing (their
 *  collection_id is set null → they fall back to Unsorted), per the FK. */
export async function deleteCollection(id: string): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!id) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
  if (error) {
    console.error('deleteCollection: delete failed', { message: error.message })
    return { ok: false, error: 'server' }
  }

  revalidatePath('/[locale]/my-space', 'page')
  return { ok: true }
}

/**
 * Follow a collection (chantier notifications). Inserts into collection_follows
 * through the caller's session — the collection_follows_insert_self RLS policy
 * (auth.uid() = user_id) enforces that a user can only create their OWN follow.
 * ignoreDuplicates makes a re-follow a no-op, and the returned rows tell us
 * whether the edge was newly created so we only notify once.
 *
 * On a NEW follow, emit a 'follow' notification to the collection OWNER (the
 * acted decision: collection-follow notifies the owner). The owner id is read
 * server-side; emitNotification drops the self-case (owner following their own
 * collection) and is best-effort — a notification failure never fails the
 * follow.
 */
export async function followCollection(collectionId: string): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!collectionId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()

  // Resolve the owner up front so a new follow can notify them. A collection the
  // caller cannot see (private, not theirs) resolves to null here and we bail
  // before writing a follow the RLS/route would not support anyway.
  const { data: collection, error: ownerErr } = await supabase
    .from('collections')
    .select('owner_id')
    .eq('id', collectionId)
    .maybeSingle()
  if (ownerErr) {
    console.error('followCollection: owner lookup failed', {
      message: ownerErr.message,
    })
    return { ok: false, error: 'server' }
  }
  if (!collection) return { ok: false, error: 'not_found' }

  const { data, error } = await supabase
    .from('collection_follows')
    .upsert(
      { user_id: userId, collection_id: collectionId },
      { onConflict: 'user_id,collection_id', ignoreDuplicates: true },
    )
    .select('id')
  if (error) {
    console.error('followCollection: insert failed', { message: error.message })
    return { ok: false, error: 'server' }
  }

  if ((data?.length ?? 0) > 0) {
    await emitNotification({
      recipientId: collection.owner_id as string,
      actorId: userId,
      type: 'follow',
      targetType: 'collection',
      targetId: collectionId,
    })
  }

  return { ok: true }
}

/** Unfollow a collection (toggle off), matching the follow write. */
export async function unfollowCollection(
  collectionId: string,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!collectionId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('collection_follows')
    .delete()
    .eq('user_id', userId)
    .eq('collection_id', collectionId)
  if (error) {
    console.error('unfollowCollection: delete failed', {
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}
