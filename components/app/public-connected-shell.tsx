'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AppShellFrame } from './app-shell-frame'
import {
  fetchConnectedShellData,
  type ConnectedShellData,
} from '@/lib/app/actions'
import type { Locale } from '@/lib/i18n/routing'

/**
 * PublicConnectedShell — the session-gated frame for a PUBLIC marketing page
 * (e.g. /explore, /curators) that must upgrade to the connected app chrome for a
 * signed-in visitor without contaminating its cookie-free, crawler-visible
 * render.
 *
 * Those pages read only the anon Supabase client (lib/public/data.ts): no
 * cookies, so the server HTML is identical for everyone and safe for crawlers.
 * That is right for SEO — but a signed-in user landing on /explore or /curators
 * would otherwise see the anonymous PublicShell (marketing header/footer) and
 * feel bounced out of the app, exactly the recette regression this fixes.
 *
 * The swap, entirely client-side and post-hydration (same pattern as
 * CollectionConnectedShell):
 *   - anon / crawler / still-checking → render {anon}, the exact anonymous frame
 *     the server sent (the page's content wrapped in <PublicShell>), so the
 *     cookie-free render is untouched and there is no hydration mismatch.
 *   - session resolved → render the bare {children} inside <AppShellFrame>, the
 *     identical connected chrome every logged-in page carries.
 *
 * Why two props instead of one. The anon frame (<PublicShell>) renders
 * <PublicFooter>, an async Server Component that calls getTranslations — which
 * cannot execute inside this 'use client' boundary. So the page server-renders
 * the whole anon tree and hands it in as the `anon` prop (already-rendered
 * server output, safe to carry across the boundary); `children` is the SAME page
 * content bare, for the connected path where AppShellFrame supplies the frame.
 * This is the one structural difference from CollectionConnectedShell, whose anon
 * fallback is genuinely bare and needs no server-rendered shell.
 *
 * SEO/cache guarantee: nothing here runs on the page's server render. The server
 * output is byte-identical with or without this wrapper, because the only effect
 * (mounting AppShellFrame) is gated on a session the server render never has —
 * the anon path always renders the server-rendered PublicShell frame, exactly as
 * before.
 */
export function PublicConnectedShell({
  locale,
  anon,
  children,
}: {
  locale: Locale
  /** The page content pre-wrapped in <PublicShell>, server-rendered. Shown to
   *  anon visitors, crawlers, and while the session check is in flight. */
  anon: ReactNode
  /** The SAME page content, bare. Mounted inside AppShellFrame for a session. */
  children: ReactNode
}) {
  const [shell, setShell] = useState<ConnectedShellData | null>(null)

  useEffect(() => {
    let active = true
    fetchConnectedShellData()
      .then((data) => {
        if (active) setShell(data)
      })
      .catch(() => {
        // Best-effort: a failed session check just leaves the public frame in
        // place — the page still renders, exactly as it does for anon.
      })
    return () => {
      active = false
    }
  }, [])

  // No session (anon, crawler, still checking, or the check failed) → the
  // server-rendered marketing frame stands, byte-identical to the cookie-free
  // server render.
  if (!shell) return <>{anon}</>

  return (
    <AppShellFrame
      user={{
        displayName: shell.user.displayName,
        username: shell.user.username,
        avatarUrl: shell.user.avatarUrl,
      }}
      userId={shell.user.id}
      locale={locale}
      saveTargets={shell.saveTargets}
      subcategoriesByTopic={shell.subcategoriesByTopic}
      unreadCount={shell.unreadCount}
      themePreference={shell.themePreference}
    >
      {children}
    </AppShellFrame>
  )
}
