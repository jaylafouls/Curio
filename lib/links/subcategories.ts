import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'

/**
 * Link categorisation reference data + inherited-suggestion reads (chantier
 * link-subcategories, Decisions Log §18).
 *
 * `link_subcategories` is public reference data (RLS: link_subcategories_select_
 * public), read exactly like `topics`. Only 2 of the 10 Topics carry rows in V1
 * (Travel, Food); the other 8 return an empty list — a Topic with no sub-category
 * is saved with topic_id alone (Model B). "Autre" always sorts last (the escape
 * valve that lets the sub-category be mandatory without ever blocking a save).
 *
 * The inherited suggestion is derived on the fly from ANY user's prior
 * user_links for the same canonical link — never stored on `links` (§18.5:
 * categorisation is a personal facet layered on a shared canonical link, never a
 * canonical column). If someone has already filed this exact link under a Topic,
 * that choice pre-fills the next saver's pickers (§18: cross-user inheritance).
 * Only the reference-table topic_id/subcategory_id crosses users — never the
 * identity of who filed it, nor any private content. It only prefills the Save
 * Flow; the user can always override it.
 */

// ── Sub-category reference reads ─────────────────────────────────────────────

export type LinkSubcategory = {
  id: string
  topicId: BadgeTopic
  label: string
  order: number
}

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

type SubcategoryRow = {
  id: string
  topic_id: string
  label: string
  sort_order: number
}

function mapSubcategory(row: SubcategoryRow): LinkSubcategory {
  return {
    id: row.id,
    topicId: row.topic_id as BadgeTopic,
    label: row.label,
    order: row.sort_order,
  }
}

/**
 * Every sub-category, grouped by Topic id and ordered by sort_order within each
 * Topic ("Autre" last). One read of the small reference table; the Save Flow and
 * the /saved filter both need the full map, so grouping in-process beats a
 * per-Topic round-trip. Topics with no sub-categories simply have no key.
 *
 * `client` lets the extension transport pass a service-role client; the web path
 * omits it and reads through the session client (the select policy is public, so
 * either works identically).
 */
export async function getSubcategoriesByTopic(
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<Record<string, LinkSubcategory[]>> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('link_subcategories')
    .select('id, topic_id, label, sort_order')
    .order('topic_id', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('subcategories: failed to load', { message: error.message })
    return {}
  }

  const byTopic: Record<string, LinkSubcategory[]> = {}
  for (const row of (data ?? []) as SubcategoryRow[]) {
    if (!isBadgeTopic(row.topic_id)) continue
    const list = byTopic[row.topic_id] ?? []
    list.push(mapSubcategory(row))
    byTopic[row.topic_id] = list
  }
  return byTopic
}

/**
 * The sub-categories for a single Topic, ordered ("Autre" last). Empty for the 8
 * Topics that define none. Thin wrapper over the grouped read for callers that
 * only need one Topic.
 */
export async function getSubcategoriesForTopic(
  topicId: string,
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<LinkSubcategory[]> {
  const byTopic = await getSubcategoriesByTopic(client)
  return byTopic[topicId] ?? []
}

// ── Inherited categorisation (suggestion prefill) ────────────────────────────

export type InheritedCategory = {
  topicId: BadgeTopic | null
  subcategoryId: string | null
}

/**
 * The most-recent categorisation of this canonical link by ANY user, if any —
 * used to prefill the Save Flow when saving a link someone has already filed
 * (§18: cross-user inheritance). Returns nulls when no one has categorised this
 * link before (or it isn't saved at all).
 *
 * Reads through the SERVICE-ROLE client on purpose: user_links RLS is owner-or-
 * public-collection, so a session read would only ever see other users' rows
 * that sit in a PUBLIC collection — hiding the Unsorted/private saves where most
 * categorisation actually lives, and silently biasing the suggestion. Bypassing
 * RLS is safe here because the query projects ONLY topic_id/subcategory_id
 * (reference-table values), never who filed the link nor any private content.
 *
 * "Most recent" (saved_at desc) wins over "most frequent": it is cheaper (no
 * aggregate), and the latest choice is the best guess for what to suggest this
 * time. A row with a topic but no sub-category still suggests the topic.
 */
export async function getInheritedCategory(
  linkId: string,
  client?: ReturnType<typeof createAdminClient>,
): Promise<InheritedCategory> {
  const supabase = client ?? createAdminClient()
  const { data, error } = await supabase
    .from('user_links')
    .select('topic_id, subcategory_id, saved_at')
    .eq('link_id', linkId)
    .not('topic_id', 'is', null)
    .order('saved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('subcategories: failed to load inherited category', {
      message: error.message,
    })
    return { topicId: null, subcategoryId: null }
  }
  if (!data) return { topicId: null, subcategoryId: null }

  const row = data as { topic_id: string | null; subcategory_id: string | null }
  return {
    topicId:
      row.topic_id && isBadgeTopic(row.topic_id)
        ? (row.topic_id as BadgeTopic)
        : null,
    subcategoryId: row.subcategory_id,
  }
}
