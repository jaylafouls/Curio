'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { AppSidebar } from './app-sidebar'
import { AppBottomNav } from './app-bottom-nav'
import { NotificationBell } from './notification-bell'
import { SaveFlowProvider } from './save-flow/save-flow-provider'
import { BrandLockup } from '@/components/public/brand-lockup'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'
import type { Locale } from '@/lib/i18n/routing'
import type { SaveTargetCollection } from '@/lib/links/data'
import type { LinkSubcategory } from '@/lib/links/subcategories'
import type { ThemePreference } from '@/lib/theme/types'

/**
 * AppShellFrame — the presentational connected frame (sidebar + single top bar +
 * main + bottom nav + Save Flow), taking ALREADY-FETCHED data as props. It holds
 * zero data reads, so it renders identically whether its props were fetched on
 * the server (the normal `AppShell` path, every connected page) or after
 * hydration by a client wrapper (the collection page's session-gated shell).
 *
 * This is the single source of truth for the connected chrome. `AppShell` is a
 * thin server wrapper that fetches the five inputs and renders this; the
 * collection page's `CollectionConnectedShell` fetches the same bundle via a
 * Server Action after hydration and renders this — so both produce byte-identical
 * chrome. See app-shell.tsx for the per-field rationale (theme boundary, the
 * single top bar replacing the old double bar, the always-present Save Flow).
 *
 * Client component: `AppSidebar`, `NotificationBell`, and `SaveFlowProvider` are
 * already `'use client'`, and the mobile brand-lockup aria-label uses
 * `useTranslations('AppNav')` (the client counterpart to the server
 * `getTranslations` the old shell called) so the frame carries no server-only
 * dependency and can mount inside a client wrapper.
 */
export function AppShellFrame({
  user,
  userId,
  locale,
  header,
  saveTargets,
  subcategoriesByTopic,
  unreadCount,
  themePreference,
  children,
}: {
  user: { displayName: string; username: string; avatarUrl: string | null }
  userId: string
  locale: Locale
  /** Optional left-slot content for the top bar (e.g. the greeting on Home). */
  header?: ReactNode
  saveTargets: SaveTargetCollection[]
  subcategoriesByTopic: Record<string, LinkSubcategory[]>
  unreadCount: number
  themePreference: ThemePreference
  children: ReactNode
}) {
  // Localised accessible name for the mobile brand lockup link (matches the
  // sidebar's "home" nav label). Client-side counterpart to the server
  // getTranslations('AppNav') the pre-extraction shell used.
  const nav = useTranslations('AppNav')

  return (
    <div
      // data-app-shell marks this element as the connected theme boundary: the
      // Settings toggle flips `.dark` HERE (nearest ancestor with the attribute)
      // for live feedback, so client and SSR agree on one boundary.
      data-app-shell=""
      className={cn(
        'flex min-h-screen bg-background text-foreground',
        themePreference === 'dark' && 'dark',
      )}
    >
      <AppSidebar user={user} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The single connected top bar. Left: mobile brand lockup (the sidebar
            that would hold it is hidden below lg) + optional page header slot
            (the greeting on Home/My Space). Right: the notification bell. Sticky
            so it stays reachable while the content column scrolls. */}
        <div className="sticky top-0 z-30 flex items-center gap-md border-b border-border bg-background/90 px-lg py-sm backdrop-blur-md lg:px-2xl">
          <Link
            href="/home"
            className="shrink-0 rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet lg:hidden"
            aria-label={nav('home')}
          >
            <BrandLockup wordmark={false} />
          </Link>
          {header ? <div className="min-w-0 flex-1">{header}</div> : <div className="flex-1" />}
          <NotificationBell unreadCount={unreadCount} />
        </div>
        <main className="flex-1">{children}</main>
        <AppBottomNav />
      </div>
      <SaveFlowProvider
        userId={userId}
        locale={locale}
        targets={saveTargets}
        subcategoriesByTopic={subcategoriesByTopic}
      />
    </div>
  )
}
