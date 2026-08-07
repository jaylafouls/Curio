'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { UserPlus, FolderHeart } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Avatar } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { cn } from '@/lib/ui/cn'
import { markAllNotificationsRead } from '@/lib/notifications/actions'
import type { AppNotification } from '@/lib/notifications/data'

/**
 * NotificationsClient — the /notifications feed with tabs (spec §8.13).
 *
 * Tabs: All · Comments · Follows · Likes · Mentions. Only All and Follows are
 * FUNCTIONAL and fed — Comments/Likes/Mentions are disabled "Coming soon"
 * affordances, because no comment/like/mention feature exists in the app to
 * source them (acted decision). They are rendered greyed and non-interactive
 * rather than as active tabs with a fake empty state, which would imply the
 * feature exists. All rows shipped this chantier are follow notifications.
 *
 * On mount, every unread notification is marked read (server action) so the bell
 * badge clears once the recipient has seen the list. The read state already
 * shown to the user isn't re-rendered — the visual "new" dot reflects the
 * is_read value at load, which is honest: they were unread when the page opened.
 */

type TabValue = 'all' | 'comments' | 'follows' | 'likes' | 'mentions'

const ENABLED_TABS: readonly TabValue[] = ['all', 'follows']
const ALL_TABS: readonly TabValue[] = [
  'all',
  'comments',
  'follows',
  'likes',
  'mentions',
]

export function NotificationsClient({
  notifications,
}: {
  notifications: AppNotification[]
}) {
  const t = useTranslations('Notifications')
  const format = useFormatter()
  const [tab, setTab] = useState<TabValue>('all')

  // Clear the unread badge once the recipient lands on the list. Best-effort:
  // a failure just leaves the badge until the next visit — no user-facing error.
  useEffect(() => {
    void markAllNotificationsRead()
  }, [])

  const visible = useMemo(() => {
    if (tab === 'follows' || tab === 'all') {
      // Only 'follow' rows exist; both All and Follows show them.
      return notifications.filter((n) => n.type === 'follow')
    }
    return []
  }, [tab, notifications])

  const isComingSoon = !ENABLED_TABS.includes(tab)

  return (
    <div className="flex flex-col gap-xl">
      {/* Tab strip — enabled tabs are buttons; coming-soon tabs are disabled. */}
      <div
        role="tablist"
        aria-label={t('tablistLabel')}
        className="flex items-center gap-lg overflow-x-auto border-b border-border"
      >
        {ALL_TABS.map((value) => {
          const enabled = ENABLED_TABS.includes(value)
          const active = value === tab
          return (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={active}
              aria-disabled={!enabled}
              disabled={!enabled}
              title={enabled ? undefined : t('comingSoon')}
              onClick={() => enabled && setTab(value)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-xs border-b-2 pb-sm font-sans text-body-small transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                !enabled
                  ? 'cursor-not-allowed border-transparent text-foreground/30'
                  : active
                    ? 'border-violet text-foreground'
                    : 'border-transparent text-foreground/60 hover:text-foreground',
              )}
            >
              {t(`tab.${value}`)}
              {!enabled ? (
                <span className="rounded-full bg-foreground/[0.06] px-xs py-[1px] font-sans text-meta text-foreground/40">
                  {t('comingSoon')}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {isComingSoon ? (
        <EmptyState
          tag={t('comingSoonTag')}
          title={t('comingSoonTitle')}
          body={t('comingSoonBody')}
        />
      ) : visible.length > 0 ? (
        <ul className="flex flex-col gap-2xs">
          {visible.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              relativeTime={format.relativeTime(new Date(n.createdAt))}
              labels={{
                followedYou: t('followedYou'),
                followedCollection: t('followedCollection'),
                someone: t('someone'),
                unread: t('unread'),
              }}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          tag={t('emptyTag')}
          title={t('emptyTitle')}
          body={t('emptyBody')}
        />
      )}
    </div>
  )
}

function NotificationRow({
  notification,
  relativeTime,
  labels,
}: {
  notification: AppNotification
  relativeTime: string
  labels: {
    followedYou: string
    followedCollection: string
    someone: string
    unread: string
  }
}) {
  const { actor, targetType, isRead } = notification
  const name = actor?.displayName ?? labels.someone
  const isCollection = targetType === 'collection'
  const Icon = isCollection ? FolderHeart : UserPlus
  const message = isCollection ? labels.followedCollection : labels.followedYou

  // A user-follow links to the actor's profile; a collection-follow (owner is
  // the recipient) also links to the follower's profile — in both cases the
  // interesting party to visit is the actor.
  const actorHref = actor ? `/profile/${actor.username}` : null

  const body = (
    <div
      className={cn(
        'flex items-center gap-md rounded-lg border border-transparent px-md py-md transition-colors',
        isRead
          ? 'hover:bg-foreground/[0.02]'
          : 'bg-violet/[0.04] hover:bg-violet/[0.06]',
      )}
    >
      <span className="relative shrink-0">
        <Avatar src={actor?.avatarUrl ?? undefined} name={name} size="sm" />
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background">
          <Icon className="size-3.5 text-violet" strokeWidth={2.25} aria-hidden />
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-sans text-body-small text-foreground">
          <span className="font-medium">{name}</span> {message}
        </span>
        <span className="font-sans text-meta text-foreground/50">
          {relativeTime}
        </span>
      </span>

      {!isRead ? (
        <span
          className="size-2 shrink-0 rounded-full bg-violet"
          aria-label={labels.unread}
        />
      ) : null}
    </div>
  )

  return (
    <li>
      {actorHref ? (
        <Link
          href={actorHref}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}
