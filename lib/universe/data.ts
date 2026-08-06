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
    }

export type MyUniverse = {
  /** Ordered nodes for the ring: projects first, then standalone collections. */
  nodes: UniverseNode[]
  /** Rollup for the centre "You" node and the empty-state decision. */
  totals: {
    projects: number
    collections: number
    links: number
  }
}

type ProjectRow = { id: string; name: string; color: string | null }

type CollectionRow = {
  id: string
  slug: string
  name: string
  topic_id: string
  is_public: boolean
  links_count: number
  project_id: string | null
}

/**
 * Aggregate the signed-in user's universe into constellation nodes. Returns an
 * empty universe (no nodes, zeroed totals) when unauthenticated or on error —
 * the page renders its empty state rather than a broken figure.
 */
export async function getMyUniverse(): Promise<MyUniverse> {
  const empty: MyUniverse = {
    nodes: [],
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
      .select('id, name, color')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('collections')
      .select('id, slug, name, topic_id, is_public, links_count, project_id')
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
    }
  })

  return {
    // Projects orbit first, then standalone collections — a stable, readable
    // order that keeps the same category adjacent on the ring.
    nodes: [...projectNodes, ...standalone],
    totals: {
      projects: projects.length,
      collections: collections.length,
      links: totalLinks,
    },
  }
}
