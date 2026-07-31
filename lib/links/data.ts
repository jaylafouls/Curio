import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'

/**
 * Data for the Save Flow "Save to" step (ADD_ITEM_FLOW §2.2 step 5 / §3 step 5):
 * the signed-in user's collections (most-recently-updated first, for the "recent
 * collections" list + search) with their sections, so the picker can offer a
 * Collection and then an optional Section inside it — plus the always-present
 * "Save to Unsorted" (collection_id NULL) option, which needs no data.
 *
 * Owner-scoped read through the authenticated session client (RLS returns the
 * user's own public + private collections and their sections). No service-role:
 * this is an ordinary owner read, exactly like lib/app/data.ts.
 */

export type SaveTargetSection = {
  id: string
  name: string
  order: number
}

export type SaveTargetCollection = {
  id: string
  name: string
  topic: BadgeTopic
  sections: SaveTargetSection[]
}

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

/**
 * The user's collections + sections for the picker. `limit` caps the list (the
 * picker searches client-side over what's loaded; a fresh account gets []). Two
 * scoped queries + an in-memory join keeps it to one round-trip pair and avoids a
 * nested select whose row-shape inference is brittle.
 */
export async function getSaveTargets(
  ownerId: string,
  limit = 100,
): Promise<SaveTargetCollection[]> {
  const supabase = await createClient()

  const { data: colls, error: collErr } = await supabase
    .from('collections')
    .select('id, name, topic_id')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (collErr) {
    console.error('save-flow: failed to load collections', {
      message: collErr.message,
    })
    return []
  }
  const collections = (colls ?? []) as {
    id: string
    name: string
    topic_id: string
  }[]
  if (collections.length === 0) return []

  const ids = collections.map((c) => c.id)
  const { data: secs, error: secErr } = await supabase
    .from('sections')
    .select('id, name, order, collection_id')
    .in('collection_id', ids)
    .order('order', { ascending: true })

  if (secErr) {
    console.error('save-flow: failed to load sections', {
      message: secErr.message,
    })
    // Non-fatal: return collections with no sections rather than nothing.
  }

  const byCollection = new Map<string, SaveTargetSection[]>()
  for (const s of (secs ?? []) as {
    id: string
    name: string
    order: number
    collection_id: string
  }[]) {
    const list = byCollection.get(s.collection_id) ?? []
    list.push({ id: s.id, name: s.name, order: s.order })
    byCollection.set(s.collection_id, list)
  }

  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    topic: (isBadgeTopic(c.topic_id) ? c.topic_id : 'ideas') as BadgeTopic,
    sections: byCollection.get(c.id) ?? [],
  }))
}
