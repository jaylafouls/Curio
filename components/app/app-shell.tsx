import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { AppBottomNav } from './app-bottom-nav'
import { SaveFlowProvider } from './save-flow/save-flow-provider'
import { getSaveTargets } from '@/lib/links/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * AppShell — the frame shared by every connected (authenticated) page:
 * /my-space, /saved, /projects, /home. Desktop: a sticky left sidebar (§7.2)
 * beside a scrolling content column. Mobile (< lg): the sidebar is hidden and a
 * sticky bottom nav takes over (§7.3).
 *
 * The connected counterpart to PublicShell. It owns navigation + the Save Flow
 * entry point (chantier 11): each page renders its own header/content into
 * `children` (the greeting header on My Space, a section header on Saved, etc.),
 * so the shell stays neutral, while the Save Flow trigger (mobile FAB / desktop
 * "Add to Curio") lives here so it is present on every connected page.
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
  children,
}: {
  user: { displayName: string; username: string; avatarUrl: string | null }
  userId: string
  locale: Locale
  children: ReactNode
}) {
  // Owner-scoped, RLS-safe read of the user's collections + sections for the
  // "Save to" step. A fresh account gets [] and the picker shows only "Unsorted".
  const saveTargets = await getSaveTargets(userId)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar user={user} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <AppBottomNav />
      </div>
      <SaveFlowProvider userId={userId} locale={locale} targets={saveTargets} />
    </div>
  )
}
