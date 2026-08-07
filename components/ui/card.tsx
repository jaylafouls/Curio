/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react'
import { Bookmark, Users } from 'lucide-react'
import { cn } from '@/lib/ui/cn'
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
 */

export type CollectionCardVariant = 'below' | 'overlay'

export interface CollectionCardProps {
  title: string
  topic: BadgeTopic
  cover?: string
  owner: { name: string; avatar?: string }
  linksCount: number
  /** Layout shape. `below` (default) = My Space; `overlay` = Home "Picked for you". */
  variant?: CollectionCardVariant
  /** Short teaser line, shown under the title in the `overlay` variant only. */
  description?: string
  className?: string
}

export function CollectionCard({
  title,
  topic,
  cover,
  owner,
  linksCount,
  variant = 'below',
  description,
  className,
}: CollectionCardProps) {
  const cardBase =
    'group flex w-full flex-col overflow-hidden rounded-lg border border-border transition-shadow duration-base hover:shadow-md dark:hover:shadow-glow-violet'

  if (variant === 'overlay') {
    return (
      <article
        className={cn(
          cardBase,
          'relative aspect-[3/4] bg-violet-soft/20',
          className,
        )}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-base group-hover:scale-[1.02]"
          />
        ) : null}
        {/* Dark scrim so overlaid light text stays legible over any cover. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-cosmic/80 via-cosmic/20 to-transparent"
          aria-hidden
        />
        <div className="absolute left-md top-md">
          <Badge topic={topic} variant="solid" />
        </div>
        {/* Text block anchored to the bottom, always light on the scrim. */}
        <div className="relative mt-auto flex flex-col gap-sm p-md text-archive">
          <h3 className="font-serif text-h3 leading-tight">{title}</h3>
          {description ? (
            <p className="font-sans text-body-small text-archive/80">
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
    <article className={cn(cardBase, 'bg-foreground/[0.03]', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-violet-soft/20">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="size-full object-cover transition-transform duration-base group-hover:scale-[1.02]"
          />
        ) : null}
        <div className="absolute left-md top-md">
          <Badge topic={topic} variant="solid" />
        </div>
      </div>
      <div className="flex flex-col gap-sm p-md">
        {/* Instrument Serif, size-only hierarchy (§2.1). Mode-aware text. */}
        <h3 className="font-serif text-h3 leading-tight text-foreground">
          {title}
        </h3>
        <div className="mt-xs flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Avatar src={owner.avatar} name={owner.name} size="sm" />
            <span className="font-sans text-meta text-foreground/70">
              {owner.name}
            </span>
          </div>
          <span className="flex items-center gap-xs font-sans text-meta text-foreground/60">
            <Bookmark className="size-3.5" strokeWidth={2} aria-hidden />
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
  className,
}: CuratorCardProps) {
  return (
    <article
      className={cn(
        'flex w-full flex-col items-center gap-md rounded-lg border border-border bg-foreground/[0.03] p-lg text-center transition-shadow duration-base hover:shadow-md dark:hover:shadow-glow-violet',
        className,
      )}
    >
      <Avatar src={avatar} name={name} size="lg" orbital />
      <div className="flex flex-col items-center gap-xs">
        <h3 className="font-serif text-h3 leading-tight text-foreground">
          {name}
        </h3>
        <Badge topic={topic}>{role}</Badge>
      </div>
      <p className="font-sans text-body-small text-foreground/70">{bio}</p>
      <div className="flex items-center gap-xs font-sans text-meta text-foreground/60">
        <Users className="size-3.5" strokeWidth={2} aria-hidden />
        {FOLLOWER_FORMAT.format(followers)} followers
      </div>
      {action ? <div className="pt-xs">{action}</div> : null}
    </article>
  )
}
