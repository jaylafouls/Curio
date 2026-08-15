import Image from 'next/image'
import type { ReactNode } from 'react'
import { Bookmark, Users } from 'lucide-react'
import { cn } from '@/lib/ui/cn'
import { TopicIcon } from '@/components/brand/topic-icon'
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

// Topic → lucide icon name, mirroring the DB seed (migration 0003) which is the
// single source of truth for each Topic's icon. The card only receives `topic`,
// not the icon string (that lives in the topics table), so the coverless
// fallback resolves the same icon locally — no data-layer or call-site change.
// If the seed's icon choices change, update these to match.
const topicIcon: Record<BadgeTopic, string> = {
  travel: 'plane',
  design: 'pen-tool',
  food: 'utensils',
  books: 'book-open',
  culture: 'landmark',
  ideas: 'lightbulb',
  style: 'shirt',
  photography: 'camera',
  beauty: 'sparkles',
  wellness: 'heart-pulse',
}

// Per-topic soft wash + matching icon colour, written as literals so Tailwind's
// JIT keeps them (mirrors the soft-badge maps in badge.tsx; the bg-badge-* set
// is also safelisted). The /15 wash tints the cover area with the topic colour
// while staying light enough for the corner Badge and the icon to sit on it.
const fallbackBg: Record<BadgeTopic, string> = {
  travel: 'bg-badge-travel/15',
  design: 'bg-badge-design/15',
  food: 'bg-badge-food/15',
  books: 'bg-badge-books/15',
  culture: 'bg-badge-culture/15',
  ideas: 'bg-badge-ideas/15',
  style: 'bg-badge-style/15',
  photography: 'bg-badge-photography/15',
  beauty: 'bg-badge-beauty/15',
  wellness: 'bg-badge-wellness/15',
}

// Overlay variant needs a deeper wash (/35) than `below` (/15): the dark
// text-legibility scrim is laid over it, so a faint tint would wash out to grey.
const overlayFallbackBg: Record<BadgeTopic, string> = {
  travel: 'bg-badge-travel/35',
  design: 'bg-badge-design/35',
  food: 'bg-badge-food/35',
  books: 'bg-badge-books/35',
  culture: 'bg-badge-culture/35',
  ideas: 'bg-badge-ideas/35',
  style: 'bg-badge-style/35',
  photography: 'bg-badge-photography/35',
  beauty: 'bg-badge-beauty/35',
  wellness: 'bg-badge-wellness/35',
}

const fallbackIconText: Record<BadgeTopic, string> = {
  travel: 'text-badge-travel',
  design: 'text-badge-design',
  food: 'text-badge-food',
  books: 'text-badge-books',
  culture: 'text-badge-culture',
  ideas: 'text-badge-ideas',
  style: 'text-badge-style',
  photography: 'text-badge-photography',
  beauty: 'text-badge-beauty',
  wellness: 'text-badge-wellness',
}

/**
 * CoverFallback — the `below`-variant coverless treatment. Instead of a
 * near-empty tinted panel, it fills the cover area with a soft wash of the
 * Topic's own colour and centres the Topic icon, reusing the exact colour+icon
 * vocabulary already designed for badges and the orbital sidebar. Decorative:
 * the Badge in the corner already announces the topic in text.
 */
function CoverFallback({ topic }: { topic: BadgeTopic }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        fallbackBg[topic],
      )}
    >
      <TopicIcon
        name={topicIcon[topic]}
        className={cn('size-10 opacity-70', fallbackIconText[topic])}
        strokeWidth={1.5}
      />
    </div>
  )
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
          // Coverless: topic-coloured wash behind the scrim (see icon below it).
          <div
            aria-hidden
            className={cn('absolute inset-0', overlayFallbackBg[topic])}
          />
        )}
        {/* Dark scrim so overlaid light text stays legible over any cover. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-cosmic/80 via-cosmic/20 to-transparent"
          aria-hidden
        />
        {/* Coverless: Topic icon above the scrim so it isn't buried, light to
            read on the darkened wash. Sits in the upper area, clear of the
            bottom text block. */}
        {cover ? null : (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 flex justify-center pt-[26%]"
          >
            <TopicIcon
              name={topicIcon[topic]}
              className="size-11 text-archive/70"
              strokeWidth={1.5}
            />
          </div>
        )}
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
          <CoverFallback topic={topic} />
        )}
        <div className="absolute left-md top-md">
          <Badge topic={topic} variant="solid" />
        </div>
      </div>
      <div className="flex flex-col gap-xs p-sm">
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
