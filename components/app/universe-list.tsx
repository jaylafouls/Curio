import { FolderOpen, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'
import type { Locale } from '@/lib/i18n/routing'
import {
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'
import type { UniverseNode } from '@/lib/universe/data'

/**
 * UniverseList — the companion navigation for My Universe (points 4 & 7). The
 * orbital above is a fixed decorative top-N hero; this list is the real way to
 * reach EVERY project and standalone collection, no matter how large the
 * universe grows. It renders the full recency-ordered node set as navigable
 * rows, echoing the orbital's Project=rounded-square / Collection=circle
 * vocabulary so a node reads the same in both places.
 *
 * Server component: pure links, no interactivity, so it stays out of the client
 * bundle. Each row is a real <Link> to /projects/[id] or /collections/[slug].
 */

function projectColorHex(color: string | null): string | null {
  if (color && color in PROJECT_COLOR_HEX) {
    return PROJECT_COLOR_HEX[color as ProjectColor]
  }
  return null
}

export async function UniverseList({
  nodes,
  locale,
}: {
  nodes: UniverseNode[]
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'MyUniverse' })

  if (nodes.length === 0) return null

  return (
    <section className="flex flex-col gap-lg">
      <h2 className="font-serif text-h3 text-foreground">{t('allTitle')}</h2>
      <ul className="flex flex-col divide-y divide-border">
        {nodes.map((node) => (
          <li key={`${node.kind}-${node.id}`}>
            <UniverseListRow node={node} label={t} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function UniverseListRow({
  node,
  label,
}: {
  node: UniverseNode
  label: Awaited<ReturnType<typeof getTranslations>>
}) {
  const isProject = node.kind === 'project'
  const href = isProject
    ? `/projects/${node.id}`
    : `/collections/${node.slug}`
  const projectHex = isProject ? projectColorHex(node.color) : null

  // Human-readable count line, mirroring the orbital's aria labels.
  const meta = isProject
    ? label('projectRowMeta', {
        collections: node.collectionsCount,
        links: node.linksCount,
      })
    : label('collectionRowMeta', { links: node.linksCount })

  const kindLabel = isProject
    ? label('legendProject')
    : label('legendCollection')

  return (
    <Link
      href={href}
      className="flex items-center gap-md rounded-md px-sm py-md transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center text-archive',
          // Same kind vocabulary as the orbital: project = rounded-square,
          // collection = circle.
          isProject ? 'rounded-lg' : 'rounded-full',
          isProject
            ? projectHex
              ? ''
              : 'bg-violet-soft text-foreground'
            : 'bg-violet text-archive',
        )}
        style={projectHex ? { backgroundColor: projectHex } : undefined}
        aria-hidden
      >
        {isProject ? (
          <FolderOpen className="size-4" strokeWidth={2} />
        ) : (
          <Sparkles className="size-4" strokeWidth={2} />
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-xs">
          <span className="truncate font-sans text-body text-foreground">
            {node.name}
          </span>
          <span className="shrink-0 rounded-full bg-foreground/[0.06] px-xs py-px font-sans text-[0.625rem] font-medium uppercase tracking-wide text-foreground/50">
            {kindLabel}
          </span>
        </span>
        <span className="truncate font-sans text-meta text-foreground/50">
          {meta}
        </span>
      </span>
    </Link>
  )
}
