import type { ReactNode } from 'react'
import { MapPin, Link2, CalendarDays } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui'
import { TopicIcon } from '@/components/brand/topic-icon'
import { PlanBadge } from '@/components/app/plan-badge'
import type { PlanBadgeKind } from '@/lib/plans/data'
import type { AppTopic } from '@/lib/app/data'

/**
 * ProfileIdentity — the shared identity block at the top of My Space (§8.9) and
 * a public profile (§8.10): orbital avatar, display name with an optional plan
 * badge (Founding / Pro, §4.1), bio, and a meta row (location · website · join
 * date).
 *
 * Topic pills (My Space only) and any actions (Edit profile on My Space, Follow
 * on a public profile) are passed in as slots so this one component serves both
 * surfaces without knowing which it is. Edit/Follow themselves are write actions
 * deferred to later chantiers — callers pass `null` for now.
 */
export function ProfileIdentity({
  displayName,
  username,
  avatarUrl,
  bio,
  location,
  websiteUrl,
  joinedLabel,
  planBadge,
  planBadgeLabel,
  topics,
  actions,
}: {
  displayName: string
  username: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  /** Pre-formatted "Joined … 2024" line (locale-resolved by the caller). */
  joinedLabel: string
  /** Resolved plan badge to show next to the name (null = free, no badge). */
  planBadge: PlanBadgeKind
  /** Accessible label for the plan badge (e.g. "Founding curator" / "Curator Pro"). */
  planBadgeLabel: string
  /** Active Topic pills — omit (undefined) on the public profile. */
  topics?: AppTopic[]
  /** Optional action slot (Edit profile / Follow), rendered under the meta row. */
  actions?: ReactNode
}) {
  // Strip a protocol/trailing slash for a cleaner display label.
  const websiteLabel = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  return (
    <div className="flex flex-col items-center gap-md text-center sm:flex-row sm:items-start sm:text-left">
      <Avatar
        src={avatarUrl ?? undefined}
        name={displayName}
        size="lg"
        orbital
      />
      <div className="flex min-w-0 flex-col items-center gap-sm sm:items-start">
        <div className="flex flex-col items-center gap-2xs sm:items-start">
          <div className="flex items-center gap-sm">
            <h2 className="font-serif text-h2 text-foreground">{displayName}</h2>
            <PlanBadge kind={planBadge} label={planBadgeLabel} />
          </div>
          <span className="font-sans text-body-small text-foreground/50">
            @{username}
          </span>
        </div>

        {bio ? (
          <p className="max-w-lg font-sans text-body-small text-foreground/70">
            {bio}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-md sm:justify-start">
          {location ? (
            <span className="flex items-center gap-xs font-sans text-meta text-foreground/60">
              <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
              {location}
            </span>
          ) : null}
          {websiteUrl && websiteLabel ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer noopener nofollow"
              className="flex items-center gap-xs rounded-sm font-sans text-meta text-violet transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
            >
              <Link2 className="size-3.5" strokeWidth={2} aria-hidden />
              {websiteLabel}
            </a>
          ) : null}
          <span className="flex items-center gap-xs font-sans text-meta text-foreground/60">
            <CalendarDays className="size-3.5" strokeWidth={2} aria-hidden />
            {joinedLabel}
          </span>
        </div>

        {topics && topics.length > 0 ? (
          <ul className="flex flex-wrap items-center justify-center gap-xs sm:justify-start">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Badge topic={topic.id}>
                  <TopicIcon name={topic.icon} className="mr-xs size-3" />
                  {topic.label}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {actions ? <div className="pt-xs">{actions}</div> : null}
      </div>
    </div>
  )
}
