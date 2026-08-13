import type { ReactNode } from 'react'
import { AppShellFrame } from './app-shell-frame'
import { getSaveTargets } from '@/lib/links/data'
import { getSubcategoriesByTopic } from '@/lib/links/subcategories'
import { getUnreadNotificationCount } from '@/lib/notifications/data'
import { getThemePreference } from '@/lib/theme/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * AppShell — the frame shared by every connected (authenticated) page:
 * /my-space, /saved, /projects, /home. Desktop: a sticky left sidebar (§7.2)
 * beside a scrolling content column. Mobile (< lg): the sidebar is hidden and a
 * sticky bottom nav takes over (§7.3).
 *
 * The connected counterpart to PublicShell. It owns navigation, the single
 * connected top bar, and the Save Flow entry point (chantier 11). Since the
 * fix/ui-collection-shell chantier, the actual chrome lives in the presentational
 * <AppShellFrame> (a client-capable component taking already-fetched data); this
 * `AppShell` is the thin SERVER wrapper that performs the four authenticated
 * reads and hands them to the frame. The collection page's client
 * `CollectionConnectedShell` fetches the same bundle after hydration and renders
 * the SAME frame, so a signed-in visitor to an ISR-cached collection sees
 * byte-identical chrome without contaminating the cookie-free cached body.
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

  // Persisted theme (§8.14 / Decisions Log §16). Applying `.dark` on the frame's
  // connected shell — not global <html> — scopes Cosmic mode to authenticated
  // pages only, leaving the public/landing surfaces on their own modes. The read
  // is server-side, so the class is in the initial HTML: no client flash (FOUC).
  const themePreference = await getThemePreference()

  return (
    <AppShellFrame
      user={user}
      userId={userId}
      locale={locale}
      header={header}
      saveTargets={saveTargets}
      subcategoriesByTopic={subcategoriesByTopic}
      unreadCount={unreadCount}
      themePreference={themePreference}
    >
      {children}
    </AppShellFrame>
  )
}
