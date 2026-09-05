import Image from 'next/image'
import type { ReactNode } from 'react'
import { Bookmark, Users } from 'lucide-react'
import { cn } from '@/lib/ui/cn'
import { TopicScene } from '@/components/brand/topic-scene'
import { Avatar } from './avatar'
import { Badge, type BadgeTopic } from './badge'

/**
 * Card — two presentational shapes from the mockups. Both are on-token: radius
 * lg cover/container, thin border-light, near-flat (shadow only on hover per
 * Design Tokens §5).
 *
 * CollectionCard has two layouts:
 *  - below (default): cover image on top, then a panel with serif title, owner
 *    (mini avatar + name) and links count underneath — the My Space "latest
 *    collections" shape.
 *  - overlay: full-bleed cover with the serif title, optional description and
 *    the owner/links row laid over the lower portion on a dark scrim — the Home
 *    "Picked for you" shape. Overlaid text is always light (it sits on an
 *    image), so it is intentionally not mode-aware.
 * Both carry a solid Topic badge top-left.
 *
 * CuratorCard (Curators list, "Curators you follow"): avatar, name, role badge,
 * short bio, and a follower count with a follow action slot.
 *
 * 2026-09-05 (Jay): vignette sizes had drifted across pages (landing/explore/
 * curators/my space each a bit different) — `compact` is now the standard for
 * both card types on every page. Landing + Explore + Curators additionally
 * share the exact same `below` (split cover/panel) shape, which Jay prefers
 * over `overlay`'s text-on-photo look for these browsing surfaces. `overlay`
 * remains for Home's "Picked for you" feed (its own established pattern, not
 * revisited here) — same `compact` sizing, different shape.
 */

export type CollectionCardVariant = 'below' | 'overlay'

export interface CollectionCardProps {
  title: string
  topic: BadgeTopic
  cover?: string
  /**
   * Up to 4 link-image URLs, used to build an automatic 2×2 mosaic cover when
   * the collection has no custom `cover` (cover-resolution tier 2). Ignored when
   * `cover` is set. Fewer than 4 adapt (1 = full bleed, 2 = split, 3 = 2+1).
   */
  mosaic?: string[]
  owner: { name: string; avatar?: string }
  linksCount: number
  /** Layout shape. `below` (default) = My Space; `overlay` = Home "Picked for you". */
  variant?: CollectionCardVariant
  /** Short teaser line, shown under the title in the `overlay` variant only. */
  description?: string
  /**
   * Smaller title/owner/count type scale + tighter panel padding, without
   * shrinking the badge (or the description in `overlay`), which already read
   * fine at any card size. This is now the site-wide default size (2026-09-05,
   * Jay: standardise vignette size/style across every page) — both variants
   * honor it.
   */
  compact?: boolean
  className?: string
}

/**
 * Collection cover resolution has three tiers (recette point 5):
 *   1. a custom `cover` the owner uploaded  → handled inline by each variant.
 *   2. no cover but the collection has links with images → an automatic 2×2
 *      `CoverMosaic` built from up to 4 of them.
 *   3. no cover and no link images → a branded per-Topic `TopicScene`.
 *
 * `CoverArt` picks between tiers 2 and 3 (tier 1 short-circuits before it), so
 * both card variants and the detail hero share one resolution and always show a
 * designed object, never an empty tinted panel.
 */
function CoverMosaic({ images }: { images: string[] }) {
  // Take at most 4; adapt the grid to how many we actually have so 1–3 images
  // still fill the frame edge-to-edge with no empty slots.
  const imgs = images.slice(0, 4)
  const grid =
    imgs.length >= 4
      ? 'grid-cols-2 grid-rows-2'
      : imgs.length === 3
        ? 'grid-cols-2 grid-rows-2'
        : imgs.length === 2
          ? 'grid-cols-2 grid-rows-1'
          : 'grid-cols-1 grid-rows-1'

  return (
    <div aria-hidden className={cn('absolute inset-0 grid gap-px', grid)}>
      {imgs.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={cn(
            'relative overflow-hidden bg-foreground/[0.04]',
            // With 3 images, the first spans both rows on the left so the pair
            // stacks on the right — a balanced 2+1 rather than an empty cell.
            imgs.length === 3 && i === 0 && 'row-span-2',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="size-full object-cover" />
        </div>
      ))}
    </div>
  )
}

function CoverArt({
  topic,
  mosaic,
}: {
  topic: BadgeTopic
  mosaic?: string[]
}) {
  if (mosaic && mosaic.length > 0) {
    return <CoverMosaic images={mosaic} />
  }
  return <TopicScene topic={topic} className="absolute inset-0 size-full" />
}

export function CollectionCard({
  title,
  topic,
  cover,
  mosaic,
  owner,
  linksCount,
  variant = 'below',
  description,
  compact = false,
  className,
}: CollectionCardProps) {
  const cardBase =
    'group flex w-full flex-col overflow-hidden rounded-lg transition-shadow duration-base hover:shadow-md dark:hover:shadow-glow-violet'

  if (variant === 'overlay') {
    return (
      <article
        className={cn(
          cardBase,
          // No border here: this variant is a full-bleed photo, and a
          // border-box border rendered outside the clipped image showed as a
          // stray light line across the top edge (Jay, 2026-08-27) — visible
          // at rest, hidden once the hover zoom grew past it. The `below`
          // variant below keeps its border; that one sits on a plain panel.
          'relative aspect-[4/5] bg-violet-soft/20',
          className,
        )}
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-base group-hover:scale-[1.02]"
          />
        ) : (
          // Coverless: automatic 2×2 mosaic if the collection has link images,
          // otherwise the branded per-Topic scene (cover-resolution tiers 2–3).
          <CoverArt topic={topic} mosaic={mosaic} />
        )}
        {/* Dark scrim so overlaid light text stays legible over any cover —
            including the mosaic and scene, which the bottom text sits on. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-cosmic/80 via-cosmic/20 to-transparent"
          aria-hidden
        />
        <div className="absolute left-md top-md">
          <Badge topic={topic} variant="solid" />
        </div>
        {/* Text block anchored to the bottom, always light on the scrim. */}
        <div className="relative mt-auto flex flex-col gap-sm p-md text-archive">
          <h3
            className={cn(
              'font-serif leading-tight',
              compact ? 'text-[17px]' : 'text-h3',
            )}
          >
            {title}
          </h3>
          {description ? (
            <p
              className={cn(
                'font-sans text-archive/80',
                compact ? 'text-meta' : 'text-body-small',
              )}
            >
              {description}
            </p>
          ) : null}
          <div className="mt-xs flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Avatar src={owner.avatar} name={owner.name} size="sm" />
              <span className="font-sans text-meta text-archive/80">
                {owner.name}
              </span>
            </div>
            <span className="flex items-center gap-xs font-sans text-meta text-archive/70">
              <Bookmark className="size-3.5" strokeWidth={2} aria-hidden />
              {linksCount}
            </span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(cardBase, 'border border-border bg-foreground/[0.03]', className)}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-violet-soft/20">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-base group-hover:scale-[1.02]"
          />
        ) : (
          <CoverArt topic={topic} mosaic={mosaic} />
        )}
        <div className="absolute left-md top-md">
          <Badge topic={topic} variant="solid" />
        </div>
      </div>
      <div className={cn('flex flex-col', compact ? 'gap-xs p-xs' : 'gap-xs p-sm')}>
        {/* DM Serif Display, size-only hierarchy (§2.1). Mode-aware text. */}
        <h3
          className={cn(
            'font-serif leading-tight text-foreground',
            compact ? 'text-[17px]' : 'text-h3',
          )}
        >
          {title}
        </h3>
        <div className="mt-xs flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Avatar src={owner.avatar} name={owner.name} size="sm" />
            <span
              className={cn(
                'font-sans text-foreground/70',
                compact ? 'text-[11px]' : 'text-meta',
              )}
            >
              {owner.name}
            </span>
          </div>
          <span
            className={cn(
              'flex items-center gap-xs font-sans text-foreground/60',
              compact ? 'text-[11px]' : 'text-meta',
            )}
          >
            <Bookmark className={compact ? 'size-3' : 'size-3.5'} strokeWidth={2} aria-hidden />
            {linksCount}
          </span>
        </div>
      </div>
    </article>
  )
}

// Deterministic follower grouping. `Number.prototype.toLocaleString()` with no
// argument uses the *ambient runtime* locale, which differs between the Node
// server (grouping "24,300") and a FR-locale browser ("24 300"), causing a
// hydration mismatch. Pinning an explicit locale keeps SSR and client output
// identical. Later locale-aware chantiers can lift this to the route locale.
const FOLLOWER_FORMAT = new Intl.NumberFormat('en-US')

export interface CuratorCardProps {
  name: string
  topic: BadgeTopic
  role: string
  bio: string
  followers: number
  avatar?: string
  /** Optional action slot, e.g. a <Button size="small">Follow</Button>. */
  action?: ReactNode
  /**
   * Smaller avatar/type scale for tight layouts (e.g. sitting size-for-size
   * next to CollectionCard's `compact` in a 5-across landing strip).
   */
  compact?: boolean
  className?: string
}

export function CuratorCard({
  name,
  topic,
  role,
  bio,
  followers,
  avatar,
  action,
  compact = false,
  className,
}: CuratorCardProps) {
  return (
    <article
      className={cn(
        'flex w-full flex-col items-center rounded-lg border border-border bg-foreground/[0.03] text-center transition-shadow duration-base hover:shadow-md dark:hover:shadow-glow-violet',
        compact ? 'gap-xs p-sm' : 'gap-md p-lg',
        className,
      )}
    >
      <Avatar src={avatar} name={name} size={compact ? 'md' : 'lg'} orbital />
      <div className="flex flex-col items-center gap-xs">
        <h3
          className={cn(
            'font-serif leading-tight text-foreground',
            compact ? 'text-[15px]' : 'text-h3',
          )}
        >
          {name}
        </h3>
        <Badge topic={topic}>{role}</Badge>
      </div>
      <p
        className={cn(
          'font-sans text-foreground/70',
          compact ? 'line-clamp-2 text-meta' : 'text-body-small',
        )}
      >
        {bio}
      </p>
      <div
        className={cn(
          'flex items-center gap-xs font-sans text-foreground/60',
          compact ? 'text-[10px]' : 'text-meta',
        )}
      >
        <Users className={compact ? 'size-3' : 'size-3.5'} strokeWidth={2} aria-hidden />
        {FOLLOWER_FORMAT.format(followers)} followers
      </div>
      {action ? <div className="pt-xs">{action}</div> : null}
    </article>
  )
}
