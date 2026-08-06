'use client'

import { FolderOpen, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'
import type { BadgeTopic } from '@/components/ui'
import {
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'
import type { UniverseNode } from '@/lib/universe/data'

/**
 * UniverseOrbital — the real interactive "My Universe" constellation (spec §7.5),
 * the centrepiece of My Space. "You" sits at the centre; the user's Projects and
 * standalone Collections orbit on a single ring. Each node is a real <Link>:
 * clicking a collection goes to /collections/[slug], a project to /projects/[id].
 * Links are not their own nodes — each node shows a real count.
 *
 * This is NOT the landing hero OrbitalViz (that renders the Core Topics, a fixed
 * marketing figure). This renders the signed-in user's own data, so nodes are
 * navigable and the empty case is a real "your universe is empty yet" state.
 *
 * Rendering is SVG rings + absolutely-positioned <Link> nodes rather than a
 * canvas: at V1 node counts (tens) this gives native focus, keyboard tabbing,
 * screen-reader labels and design-token fidelity for free, with no hand-rolled
 * hit-testing. V1 is a fixed constellation — no free pan/zoom (decision actée).
 *
 * Motion is deliberately subtle: a staggered fade-in on mount and a gentle
 * hover/focus lift. There is NO continuous orbital rotation here — rotating the
 * ring would move the click targets under the cursor, which is hostile for a
 * navigable figure (the hero viz can rotate because it is decorative). Every
 * animation is gated behind `motion-reduce:` so `prefers-reduced-motion: reduce`
 * gets a static, fully-usable constellation.
 */

// Node ring radius as a % of the container half-size. < 50 keeps nodes (and the
// room their labels need) inside the square box at every breakpoint.
const RING_RADIUS_PCT = 40

/**
 * Resolve a project's stored colour TOKEN (violet/beige/vert/bleu/rose — the DB
 * stores the token, not a hex, per lib/projects/colors.ts) to its hex swatch.
 * Returns null for a missing or unrecognised value so the node falls back to the
 * neutral container instead of an invalid inline style.
 */
function projectColorHex(color: string | null): string | null {
  if (color && color in PROJECT_COLOR_HEX) {
    return PROJECT_COLOR_HEX[color as ProjectColor]
  }
  return null
}

/** Evenly space N nodes around the ring, starting at the top (12 o'clock). */
function nodePosition(index: number, count: number) {
  const angle = (index / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2
  return {
    x: 50 + RING_RADIUS_PCT * Math.cos(angle),
    y: 50 + RING_RADIUS_PCT * Math.sin(angle),
  }
}

// Per-topic solid backgrounds, written as literals so Tailwind's JIT keeps them
// (mirrors components/ui/badge.tsx — the bg-badge-* set is also safelisted).
const topicBg: Record<BadgeTopic, string> = {
  travel: 'bg-badge-travel',
  design: 'bg-badge-design',
  food: 'bg-badge-food',
  books: 'bg-badge-books',
  culture: 'bg-badge-culture',
  ideas: 'bg-badge-ideas',
  style: 'bg-badge-style',
  photography: 'bg-badge-photography',
  beauty: 'bg-badge-beauty',
  wellness: 'bg-badge-wellness',
}

export function UniverseOrbital({
  nodes,
  centerLabel,
}: {
  nodes: UniverseNode[]
  /** The short label inside the centre "You" node (localised). */
  centerLabel: string
}) {
  const t = useTranslations('MyUniverse')

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[30rem]"
      role="group"
      aria-label={t('figureLabel')}
    >
      {/* Decorative orbit rings + spokes to each node. aria-hidden: the nodes
          below carry the real, announced content. */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full"
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS_PCT}
          fill="none"
          className="stroke-border-light"
          strokeWidth="0.3"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS_PCT * 0.55}
          fill="none"
          className="stroke-violet/20"
          strokeWidth="0.3"
        />
        {nodes.map((node, i) => {
          const { x, y } = nodePosition(i, nodes.length)
          return (
            <line
              key={node.id}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              className="stroke-border-light/60"
              strokeWidth="0.2"
            />
          )
        })}
      </svg>

      {/* Centre — "You". Decorative label; the surrounding group is labelled. */}
      <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-violet font-serif text-h3 text-archive shadow-glow-violet sm:size-16">
          {centerLabel}
        </span>
      </div>

      {/* Orbiting nodes — each a real navigable link. */}
      {nodes.map((node, i) => {
        const { x, y } = nodePosition(i, nodes.length)
        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              // Stagger the entrance so the constellation resolves outward.
              animationDelay: `${i * 60}ms`,
            }}
          >
            <UniverseNodeLink node={node} tooltip={t} />
          </div>
        )
      })}
    </div>
  )
}

function UniverseNodeLink({
  node,
  tooltip,
}: {
  node: UniverseNode
  tooltip: ReturnType<typeof useTranslations<'MyUniverse'>>
}) {
  const isProject = node.kind === 'project'
  const href = isProject
    ? `/projects/${node.id}`
    : `/collections/${node.slug}`

  // Accessible name: the human sentence a screen reader announces for the node,
  // carrying type, name and the real count so the figure is usable without sight.
  const ariaLabel = isProject
    ? tooltip('projectNodeLabel', {
        name: node.name,
        collections: node.collectionsCount,
        links: node.linksCount,
      })
    : tooltip('collectionNodeLabel', {
        name: node.name,
        links: node.linksCount,
      })

  const count = isProject ? node.collectionsCount : node.linksCount
  const projectHex = isProject ? projectColorHex(node.color) : null

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      title={node.name}
      className={cn(
        'group flex w-[5.5rem] flex-col items-center gap-xs rounded-md p-xs text-center',
        'transition-transform duration-base motion-reduce:transition-none',
        'hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0',
        'animate-fade-in motion-reduce:animate-none',
        'focus-visible:outline-none',
      )}
    >
      <span
        className={cn(
          'relative flex size-11 items-center justify-center rounded-full text-archive shadow-sm sm:size-12',
          'ring-2 ring-transparent transition-shadow duration-base',
          'group-hover:shadow-md group-focus-visible:ring-violet',
          isProject
            ? // Project node: tinted by the owner-chosen colour when present,
              // else a neutral violet-soft container.
              projectHex
              ? ''
              : 'bg-violet-soft text-foreground'
            : topicBg[node.topic],
        )}
        style={projectHex ? { backgroundColor: projectHex } : undefined}
      >
        {isProject ? (
          <FolderOpen className="size-5" strokeWidth={2} aria-hidden />
        ) : (
          <Sparkles className="size-5" strokeWidth={2} aria-hidden />
        )}
        {/* Count chip — the real link/collection number for this node. */}
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-foreground px-1 font-sans text-[0.625rem] font-medium leading-tight text-background">
            {count}
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 max-w-full font-sans text-meta font-medium text-foreground/80">
        {node.name}
      </span>
    </Link>
  )
}
