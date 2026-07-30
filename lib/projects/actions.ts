'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PROJECT_COLORS, type ProjectColor } from './colors'

/**
 * Project Server Actions (chantier 10) — minimal by design.
 *
 * A Project is an ALWAYS-PRIVATE organizational container (data model §5 /
 * ADD_ITEM_FLOW §5.3): it has a name and a colour, holds Collections, and never
 * has an is_public toggle or direct Links. These actions therefore expose only
 * name + colour writes and collection attachment — nothing else.
 *
 * All run authenticated, re-derive the user from the session, and write through
 * owner-only RLS (projects_all_owner).
 */

type Err = 'unauthenticated' | 'invalid' | 'server' | 'not_found'
type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: Err }

const NAME_MAX = 100

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t.length < 1 || t.length > NAME_MAX) return null
  return t
}

function cleanColor(input: unknown): ProjectColor | null {
  if (typeof input !== 'string') return null
  return (PROJECT_COLORS as readonly string[]).includes(input)
    ? (input as ProjectColor)
    : null
}

/** Create a project (name + colour). Returns the new id for navigation. */
export async function createProject(
  name: string,
  color: string,
): Promise<Result<{ id: string }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const cleanedName = cleanName(name)
  const cleanedColor = cleanColor(color)
  if (!cleanedName || !cleanedColor) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: userId, name: cleanedName, color: cleanedColor })
    .select('id')
    .single()

  if (error || !data) {
    console.error('createProject: insert failed', { message: error?.message })
    return { ok: false, error: 'server' }
  }

  revalidatePath('/[locale]/projects', 'page')
  return { ok: true, id: data.id }
}

/** Edit a project's name and/or colour (the only editable fields). */
export async function updateProject(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!id) return { ok: false, error: 'invalid' }

  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const n = cleanName(patch.name)
    if (!n) return { ok: false, error: 'invalid' }
    update.name = n
  }
  if (patch.color !== undefined) {
    const c = cleanColor(patch.color)
    if (!c) return { ok: false, error: 'invalid' }
    update.color = c
  }
  if (Object.keys(update).length === 0) return { ok: true }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('updateProject: update failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  if (!data) return { ok: false, error: 'not_found' }

  revalidatePath('/[locale]/projects', 'page')
  revalidatePath(`/[locale]/projects/${id}`, 'page')
  return { ok: true }
}

/** Delete a project. Its collections are NOT deleted — collections.project_id is
 *  ON DELETE SET NULL, so they become standalone (data model §6). */
export async function deleteProject(id: string): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!id) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
  if (error) {
    console.error('deleteProject: delete failed', { message: error.message })
    return { ok: false, error: 'server' }
  }

  revalidatePath('/[locale]/projects', 'page')
  return { ok: true }
}

/**
 * Attach an EXISTING collection to a project — sets its project_id. Moves it out
 * of any prior project (collections belong to at most one project). Both the
 * project and the collection must be owned by the caller.
 */
export async function attachCollectionToProject(
  projectId: string,
  collectionId: string,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!projectId || !collectionId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()

  // Verify project ownership (collection ownership is enforced by the update's
  // owner_id filter + RLS).
  const { data: proj } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (!proj) return { ok: false, error: 'not_found' }

  const { data, error } = await supabase
    .from('collections')
    .update({ project_id: projectId })
    .eq('id', collectionId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('attachCollectionToProject: update failed', {
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }
  if (!data) return { ok: false, error: 'not_found' }

  revalidatePath(`/[locale]/projects/${projectId}`, 'page')
  return { ok: true }
}

/** Detach a collection from its project (project_id → null → standalone). */
export async function detachCollectionFromProject(
  collectionId: string,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!collectionId) return { ok: false, error: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('collections')
    .update({ project_id: null })
    .eq('id', collectionId)
    .eq('owner_id', userId)
  if (error) {
    console.error('detachCollectionFromProject: update failed', {
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }
  revalidatePath('/[locale]/projects', 'page')
  return { ok: true }
}
