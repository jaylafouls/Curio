import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { AppBottomNav } from './app-bottom-nav'
import { NotificationBell } from './notification-bell'
import { SaveFlowProvider } from './save-flow/save-flow-provider'
import { BrandLockup } from '@/components/public/brand-lockup'
import { Link } from '@/lib/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getSaveTargets } from '@/lib/links/data'
import { getSubcategoriesByTopic } from '@/lib/links/subcategories'
import { getUnreadNotificationCount } from '@/lib/notifications/data'
import { getThemePreference } from '@/lib/theme/data'
import { cn } from '@/lib/ui/cn'
import type { Locale } from '@/lib/i18n/routing'

/**
 * AppShell — the frame shared by every connected (authenticated) page:
 * /my-space, /saved, /projects, /home. Desktop: a sticky left sidebar (§7.2)
 * beside a scrolling content column. Mobile (< lg): the sidebar is hidden and a
 * sticky bottom nav takes over (§7.3).
 *
 * The connected counterpart to PublicShell. It owns navigation, the single
 * connected top bar, and the Save Flow entry point (chantier 11). The top bar is
 * the ONE header on every connected page: the mobile brand lockup and an
 * optional page-supplied `header` slot sit on the left, the notification bell on
 * the right. Pages that want a greeting (Home, My Space) pass <AppGreeting /> as
 * `header`; section pages leave it empty and lead with their own in-flow header.
 * This replaces the earlier double-bar layout where AppShell rendered a bell-only
 * bar and Home/My Space stacked a second bordered greeting header beneath it.
 *
 * The Save Flow trigger (mobile FAB / desktop "Add to Curio") also lives here so
 * it is present on every connected page.
 *
 * `user` is the signed-in user (guaranteed by the middleware guard on these
 * routes); `userId` is its auth id, used to load the Save Flow's target
 * collections server-side. `locale` is threaded to the sidebar (plain-form
 * sign-out keeps its prefix) and to the Save Flow (localised confirmation CTAs).
 */
export async function AppShell({
  user,
  userId,
  locale,
  header,
  children,
}: {
  user: { displayName: string; username: string; avatarUrl: string | null }
  userId: string
  locale: Locale
  /** Optional left-slot content for the top bar (e.g. the greeting on Home). */
  header?: ReactNode
  children: ReactNode
}) {
  // Owner-scoped, RLS-safe read of the user's collections + sections for the
  // "Save to" step. A fresh account gets [] and the picker shows only "Unsorted".
  const saveTargets = await getSaveTargets(userId)

  // Public reference data: sub-categories grouped by Topic (Decisions Log §18).
  // Only Travel/Food carry rows in V1; the map feeds the Save Flow's conditional
  // sub-category picker. Read once here, threaded through the provider.
  const subcategoriesByTopic = await getSubcategoriesByTopic()

  // Unread notification count for the header bell (chantier notifications). RLS
  // scopes it to the signed-in recipient; 0 for a fresh account.
  const unreadCount = await getUnreadNotificationCount(userId)

  // Persisted theme (§8.14 / Decisions Log §16). Applying `.dark` HERE — on the
  // connected shell, not global <html> — scopes Cosmic mode to authenticated
  // pages only, leaving the public/landing surfaces on their own modes. The read
  // is server-side, so the class is in the initial HTML: no client flash (FOUC).
  const themePreference = await getThemePreference()

  // Localised accessible name for the mobile brand lockup link (matches the
  // sidebar's "home" nav label, which previously carried this on AppHeader).
  const nav = await getTranslations('AppNav')

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
