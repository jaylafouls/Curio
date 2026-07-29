import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { AppBottomNav } from './app-bottom-nav'

/**
 * AppShell — the frame shared by every connected (authenticated) page:
 * /my-space, /saved, /projects, /home. Desktop: a sticky left sidebar (§7.2)
 * beside a scrolling content column. Mobile (< lg): the sidebar is hidden and a
 * sticky bottom nav takes over (§7.3).
 *
 * The connected counterpart to PublicShell. It owns navigation only; each page
 * renders its own header/content into `children` (the greeting header on
 * My Space, a section header on Saved, etc.), so the shell stays neutral.
 *
 * `user` is the signed-in user (guaranteed by the middleware guard on these
 * routes). `locale` is threaded to the sidebar so the plain-form sign-out action
 * keeps its locale prefix.
 */
export function AppShell({
  user,
  locale,
  children,
}: {
  user: { displayName: string; username: string; avatarUrl: string | null }
  locale: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar user={user} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <AppBottomNav />
      </div>
    </div>
  )
}
