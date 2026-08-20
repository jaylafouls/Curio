import { createClient } from '@/lib/supabase/server'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'

/**
 * "My Universe" aggregation (spec §7.5) for the My Space orbital view.
 *
 * The universe hierarchy (data model §5/§6) is:
 *   You → Projects (private containers) → Collections → Links
 *   plus standalone Collections (project_id NULL) that hang directly off You.
 *
 * The V1 constellation renders ONE ring around "You": a node per Project and a
 * node per standalone Collection. Links are not their own nodes — each node
 * carries a real count (a collection's links_count, a project's summed links
 * across its collections). Clicking a collection navigates to /collections/[slug];
 * clicking a project navigates to /projects/[id].
 *
 * Everything reads through the AUTHENTICATED server client, so RLS scopes rows to
 * the signed-in owner (projects are owner-only; own collections return public +
 * private). No service-role, no fake seeding — a fresh account yields an empty
 * universe and the page shows its designed empty state, same rule as the rest of
 * the connected app (lib/app/data.ts).
 *
 * Two flat reads (projects, collections) are grouped in-process rather than a
 * nested join: it keeps each query trivially RLS-checkable and the grouping is a
 * single pass over a small, owner-scoped set.
 */

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

/** A clickable node in the constellation — a project or a standalone collection. */
export type UniverseNode =
  | {
      kind: 'project'
      id: string
      name: string
      /** Optional owner-chosen project colour (hex), used to tint the node. */
      color: string | null
      /** Number of collections inside this project. */
      collectionsCount: number
      /** Total links across the project's collections (sum of links_count). */
      linksCount: number
      /** Last-updated ISO timestamp — drives the hero's "most recent" slice. */
      updatedAt: string
    }
  | {
      kind: 'collection'
      id: string
      name: string
      /** Stable public URL segment (collections.slug) — the navigation target. */
      slug: string
      /** Topic drives the node's badge colour. */
      topic: BadgeTopic
      isPublic: boolean
      /** Real trigger-maintained count (collections.links_count). */
      linksCount: number
      /** Last-updated ISO timestamp — drives the hero's "most recent" slice. */
      updatedAt: string
    }

/** How many nodes the orbital hero shows before the companion list takes over. */
export const UNIVERSE_HERO_SIZE = 8

export type MyUniverse = {
  /**
   * Every node, ordered most-recently-updated first — the companion list's
   * source (points 4 & 7: the real navigation, access to ALL collections).
   */
  nodes: UniverseNode[]
  /**
   * The orbital hero slice: the {@link UNIVERSE_HERO_SIZE} most-recent nodes.
   * The orbit is a fixed decorative hero, never scales — the list below is the
   * navigation once the universe grows.
   */
  hero: UniverseNode[]
  /** Rollup for the centre "You" node and the empty-state decision. */
  totals: {
    projects: number
    collections: number
    links: number
  }
}

type ProjectRow = {
  id: string
  name: string
  color: string | null
  updated_at: string
}

type CollectionRow = {
  id: string
  slug: string
  name: string
  topic_id: string
  is_public: boolean
  links_count: number
  project_id: string | null
  updated_at: string
}

/**
 * Aggregate the signed-in user's universe into constellation nodes. Returns an
 * empty universe (no nodes, zeroed totals) when unauthenticated or on error —
 * the page renders its empty state rather than a broken figure.
 */
export async function getMyUniverse(): Promise<MyUniverse> {
  const empty: MyUniverse = {
    nodes: [],
    hero: [],
    totals: { projects: 0, collections: 0, links: 0 },
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const [projectsRes, collectionsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, color, updated_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('collections')
      .select(
        'id, slug, name, topic_id, is_public, links_count, project_id, updated_at',
      )
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  if (projectsRes.error) {
    console.error('universe: failed to load projects', {
      message: projectsRes.error.message,
    })
  }
  if (collectionsRes.error) {
    console.error('universe: failed to load collections', {
      message: collectionsRes.error.message,
    })
  }
  // A hard failure on either read yields the empty state, not a partial figure.
  if (projectsRes.error && collectionsRes.error) return empty

  const projects = (projectsRes.data ?? []) as ProjectRow[]
  const collections = ((collectionsRes.data ?? []) as CollectionRow[]).filter(
    (row) => isBadgeTopic(row.topic_id),
  )

  // One pass over collections: sum each project's collection/link rollup, and
  // collect the standalone (project_id NULL) collections as their own nodes.
  const projectRollup = new Map<string, { collections: number; links: number }>()
  const standalone: UniverseNode[] = []
  let totalLinks = 0

  for (const c of collections) {
    const links = c.links_count ?? 0
    totalLinks += links
    if (c.project_id) {
      const roll = projectRollup.get(c.project_id) ?? { collections: 0, links: 0 }
      roll.collections += 1
      roll.links += links
      projectRollup.set(c.project_id, roll)
    } else {
      standalone.push({
        kind: 'collection',
        id: c.id,
        name: c.name,
        slug: c.slug,
        topic: c.topic_id as BadgeTopic,
        isPublic: c.is_public,
        linksCount: links,
        updatedAt: c.updated_at,
      })
    }
  }

  const projectNodes: UniverseNode[] = projects.map((p) => {
    const roll = projectRollup.get(p.id) ?? { collections: 0, links: 0 }
    return {
      kind: 'project',
      id: p.id,
      name: p.name,
      color: p.color,
      collectionsCount: roll.collections,
      linksCount: roll.links,
      updatedAt: p.updated_at,
    }
  })

  // One recency-ordered list across BOTH kinds. This is the companion list's
  // source (all projects + standalone collections, the real navigation) and the
  // hero's source: the orbit shows the top-N most-recent, the list shows all.
  const nodes = [...projectNodes, ...standalone].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )

  return {
    nodes,
    hero: nodes.slice(0, UNIVERSE_HERO_SIZE),
    totals: {
      projects: projects.length,
      collections: collections.length,
      links: totalLinks,
    },
  }
}

/**
 * A single actionable nudge for the My Universe sidebar (point 5), chosen from
 * data ALREADY tracked today — no dependency on click/view analytics (Decisions
 * Log §11 pt 13, which does not exist yet). Priority order surfaces the most
 * useful first step: get a first project, then file unsorted links. `kind: 'none'`
 * means the universe is in good shape and the card renders a neutral recap
 * instead of a chore.
 *
 * A `coverless_collections` nudge was considered but dropped: there is no
 * grouped cover-editing screen that would actually resolve it (covers are set
 * per-collection in each collection's edit flow), so the CTA had no honest
 * destination. Reopenable if such a screen ever lands.
 */
export type UniverseNudge =
  | { kind: 'first_project' }
  | { kind: 'unsorted_links'; count: number }
  | { kind: 'none' }

/**
 * Richer "universe at a glance" figures (point 6), all from tracked columns:
 * the project/collection mix, how the collections split standalone vs filed in
 * a project, the most-used Topic, and the age span of the oldest collection.
 * No click/view metrics.
 */
export type UniverseInsights = {
  stats: {
    projects: number
    collections: number
    /** Standalone collections (project_id NULL) — hang directly off You. */
    standaloneCollections: number
    /** Collections filed inside a project. */
    filedCollections: number
    /** The user's most-used Topic across their collections, if any. */
    topTopic: BadgeTopic | null
    /** ISO date of the oldest collection's creation, for an "active since" line. */
    oldestCreatedAt: string | null
  }
  nudge: UniverseNudge
}

type InsightProjectRow = { id: string }
type InsightCollectionRow = {
  topic_id: string
  project_id: string | null
  created_at: string
}

/**
 * Compute the sidebar's richer stats + the one actionable nudge in a single
 * authenticated pass. Returns a zeroed/`none` shape when unauthenticated or on
 * error, so the sidebar degrades to a neutral state rather than a broken card.
 */
export async function getUniverseInsights(): Promise<UniverseInsights> {
  const empty: UniverseInsights = {
    stats: {
      projects: 0,
      collections: 0,
      standaloneCollections: 0,
      filedCollections: 0,
      topTopic: null,
      oldestCreatedAt: null,
    },
    nudge: { kind: 'none' },
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const [projectsRes, collectionsRes, unsortedRes] = await Promise.all([
    supabase.from('projects').select('id').eq('owner_id', user.id),
    supabase
      .from('collections')
      .select('topic_id, project_id, created_at')
      .eq('owner_id', user.id),
    // Unsorted = saved links not yet placed in any collection (collection_id
    // NULL, data model §9). A pure count, head-only, no rows fetched.
    supabase
      .from('user_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('collection_id', null),
  ])

  if (projectsRes.error || collectionsRes.error) {
    console.error('universe insights: failed to load', {
      projects: projectsRes.error?.message,
      collections: collectionsRes.error?.message,
    })
    return empty
  }

  const projects = (projectsRes.data ?? []) as InsightProjectRow[]
  const collections = (collectionsRes.data ?? []) as InsightCollectionRow[]
  const unsortedLinks = unsortedRes.count ?? 0

  let standalone = 0
  let filed = 0
  let oldest: string | null = null
  const topicTally = new Map<BadgeTopic, number>()

  for (const c of collections) {
    if (c.project_id) filed += 1
    else standalone += 1

    if (!oldest || c.created_at < oldest) oldest = c.created_at

    if (isBadgeTopic(c.topic_id)) {
      topicTally.set(c.topic_id, (topicTally.get(c.topic_id) ?? 0) + 1)
    }
  }

  let topTopic: BadgeTopic | null = null
  let topCount = 0
  for (const [topic, n] of topicTally) {
    if (n > topCount) {
      topCount = n
      topTopic = topic
    }
  }

  // Nudge priority: a first project unlocks organisation; then file loose
  // links. All from tracked data.
  let nudge: UniverseNudge = { kind: 'none' }
  if (projects.length === 0) {
    nudge = { kind: 'first_project' }
  } else if (unsortedLinks > 0) {
    nudge = { kind: 'unsorted_links', count: unsortedLinks }
  }

  return {
    stats: {
      projects: projects.length,
      collections: collections.length,
      standaloneCollections: standalone,
      filedCollections: filed,
      topTopic,
      oldestCreatedAt: oldest,
    },
    nudge,
  }
}
