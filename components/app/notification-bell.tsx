'use client'

import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'

/**
 * NotificationBell — the connected header bell (spec §7.4 / §8.13), rendered by
 * AppShell so it is present on EVERY connected page (not just the two that carry
 * the greeting header). Routes to /notifications and shows an unread-count badge.
 *
 * The count is resolved server-side per request in AppShell and passed in, so
 * the bell reflects the true unread total on load without a client fetch. A
 * count of 0 shows the bell with no badge; >99 is capped to "99+" so the badge
 * never blows out its pill. The badge is aria-hidden and the accessible name
 * carries the count in words, so a screen reader hears "Notifications, N unread"
 * rather than a bare number glued to the icon.
 */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations('AppNav')
  const pathname = usePathname()
  const active =
    pathname === '/notifications' || pathname.startsWith('/notifications/')
  const hasUnread = unreadCount > 0
  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <Link
      href="/notifications"
      aria-current={active ? 'page' : undefined}
      aria-label={
        hasUnread
          ? t('notificationsWithCount', { count: unreadCount })
          : t('notifications')
      }
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
        active
          ? 'bg-foreground/[0.06] text-foreground'
          : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground',
      )}
    >
      <Bell className="size-5" strokeWidth={2} aria-hidden />
      {hasUnread ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-violet px-1 py-[1px] font-sans text-[10px] font-medium leading-none text-button-text-on-dark"
        >
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
