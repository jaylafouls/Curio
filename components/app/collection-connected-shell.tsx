'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AppShellFrame } from './app-shell-frame'
import {
  fetchConnectedShellData,
  type ConnectedShellData,
} from '@/lib/app/actions'
import type { Locale } from '@/lib/i18n/routing'

/**
 * CollectionConnectedShell — the session-gated connected chrome layered OVER the
 * ISR collection page for signed-in visitors, without touching the cookie-free
 * cached body.
 *
 * The collection route (/collections/[id]) ships an anon, ISR-cached,
 * crawler-visible body: cookie-free, so the HTML is identical for everyone and
 * safe to cache (see collections/[id]/page.tsx). That is deliberate for SEO — but
 * it means a signed-in user visiting a Collection would otherwise lose the whole
 * app frame (sidebar, top bar, bell, Save Flow) that every other connected page
 * carries. This wrapper restores it the same way CollectionOwnerOverlay restores
 * owner controls: entirely client-side, after hydration.
 *
 * On mount it calls fetchConnectedShellData() (a Server Action that re-derives
 * the caller from the session server-side). Until that resolves — and FOREVER for
 * an anonymous visitor or a crawler, which never carry a session and thus get
 * null — it renders {children} BARE: the exact DOM the server sent, so there is
 * no hydration mismatch and the cookie-free cached body is untouched. When a
 * session resolves, it wraps the SAME children in <AppShellFrame> (the identical
 * chrome every connected page uses). The children subtree is stable across the
 * swap, so React re-parents it under the frame rather than remounting it.
 *
 * SEO/cache guarantee: nothing here runs on the server render of the page. The
 * server output — the ISR-cached body and its metadata — is byte-identical with
 * or without this wrapper present, because the wrapper's only effect (mounting
 * the frame) is gated on a session that the cached render never has.
 */
export function CollectionConnectedShell({
  locale,
  children,
}: {
  locale: Locale
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
        // Best-effort: a failed session check just means no chrome — the body
        // still renders bare, exactly as it does for anon.
      })
    return () => {
      active = false
    }
  }, [])

  // No session (anon, crawler, still checking, or the check failed) → the ISR
  // body stands alone, byte-identical to the cached render.
  if (!shell) return <>{children}</>

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
