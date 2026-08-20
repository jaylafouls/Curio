import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import type { AppCollection } from '@/lib/app/data'

/**
 * Project DETAIL reads (chantier 10) for /projects/[id].
 *
 * Projects are ALWAYS private (data model §5 / ADD_ITEM_FLOW §5.3) — there is no
 * anon path here. Every read goes through the authenticated session client and
 * is owner-scoped (projects_all_owner RLS + explicit owner_id filter), so a
 * project only ever resolves for its owner. Returns null otherwise → 404.
 */

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

export type ProjectDetail = {
  id: string
  name: string
  description: string | null
  color: string | null
  /** Custom cover image URL (project-covers bucket), or null → colour pastille. */
  coverImageUrl: string | null
  /** Collections inside this project (public + private — this is the owner view). */
  collections: AppCollection[]
  /** Total links across the project's collections (sum of links_count). */
  totalLinks: number
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

const PROJECT_COLLECTION_SELECT =
  'id, slug, name, cover_image_url, topic_id, is_public, links_count, ' +
  'owner:users!collections_owner_id_fkey (display_name, avatar_url, username)'

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
 * A project the current session owns, by id, with its collections and the total
 * link count across them. Returns null when unauthenticated or not the owner.
 */
export async function getOwnerProjectById(
  projectId: string,
): Promise<ProjectDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, color, cover_image_url')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('projects: owner read failed', { message: error.message })
    return null
  }
  if (!project) return null

  const { data: collections, error: collErr } = await supabase
    .from('collections')
    .select(PROJECT_COLLECTION_SELECT)
    .eq('project_id', projectId)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (collErr) {
    console.error('projects: collections read failed', {
      message: collErr.message,
    })
  }

  const mapped = ((collections ?? []) as unknown as CollectionRow[])
    .filter((row) => isBadgeTopic(row.topic_id))
    .map(mapCollection)

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    coverImageUrl: (project as { cover_image_url: string | null })
      .cover_image_url,
    collections: mapped,
    totalLinks: mapped.reduce((sum, c) => sum + c.linksCount, 0),
  }
}

export type AttachableCollection = {
  id: string
  title: string
  topic: BadgeTopic
  /** null = standalone, or the id of the project it currently belongs to. */
  currentProjectId: string | null
}

/**
 * The owner's collections that can be attached to `projectId` — i.e. every own
 * collection NOT already in this project (standalone ones and ones sitting in a
 * different project, which would be moved). Powers "attach existing" in the
 * add-collection flow. Empty for a fresh account.
 */
export async function getAttachableCollections(
  projectId: string,
): Promise<AttachableCollection[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, topic_id, project_id')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('projects: attachable read failed', { message: error.message })
    return []
  }

  return ((data ?? []) as {
    id: string
    name: string
    topic_id: string
    project_id: string | null
  }[])
    .filter((row) => row.project_id !== projectId && isBadgeTopic(row.topic_id))
    .map((row) => ({
      id: row.id,
      title: row.name,
      topic: row.topic_id as BadgeTopic,
      currentProjectId: row.project_id,
    }))
}
