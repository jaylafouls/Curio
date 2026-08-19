'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AppShellFrame } from './app-shell-frame'
import { AppShellSkeleton } from './app-shell-skeleton'
import {
  fetchConnectedShellData,
  type ConnectedShellData,
} from '@/lib/app/actions'
import { hasLikelySession } from '@/lib/auth/session-hint'
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
  shell: shellProp,
  resolved: resolvedProp,
}: {
  locale: Locale
  children: ReactNode
  /**
   * Pre-fetched chrome bundle, when a caller already resolved the session in the
   * SAME round-trip as its own data (CollectionPrivateClient does this via
   * fetchPrivateCollectionView to avoid a second session request). When provided,
   * this shell skips its own fetch entirely.
   */
  shell?: ConnectedShellData | null
  /**
   * Whether `shell` reflects a COMPLETED session check. With shellProp given, a
   * null shell is ambiguous (anon, or not-yet-fetched); `resolved` disambiguates
   * so the skeleton shows only while genuinely pending, never after a real anon
   * result.
   */
  resolved?: boolean
}) {
  const controlled = shellProp !== undefined
  const [shell, setShell] = useState<ConnectedShellData | null>(
    shellProp ?? null,
  )
  // Distinguish "still checking" from "checked, no session". Start pending only
  // in the self-fetching mode; in controlled mode the parent owns resolution.
  const [resolved, setResolved] = useState(controlled ? !!resolvedProp : false)

  // Client-only hint: paint the skeleton frame while pending ONLY for a visitor
  // who is likely signed in (carries the auth cookie). Anon visitors/crawlers
  // fall straight through to the bare body, so the cookie-free render is
  // untouched. Computed after mount to keep SSR output free of any session
  // branch (useState initialiser would run on the server too).
  const [likelySession, setLikelySession] = useState(false)

  useEffect(() => {
    setLikelySession(hasLikelySession())
  }, [])

  useEffect(() => {
    if (controlled) {
      setShell(shellProp ?? null)
      setResolved(!!resolvedProp)
      return
    }
    let active = true
    fetchConnectedShellData()
      .then((data) => {
        if (active) {
          setShell(data)
          setResolved(true)
        }
      })
      .catch(() => {
        // Best-effort: a failed session check just means no chrome — the body
        // still renders bare, exactly as it does for anon.
        if (active) setResolved(true)
      })
    return () => {
      active = false
    }
  }, [controlled, shellProp, resolvedProp])

  // Session resolved → the real connected frame.
  if (shell) {
    return renderFrame(shell)
  }

  // Still checking AND the visitor carries an auth cookie → paint the skeleton
  // chrome so a client-side navigation into this cookie-free page keeps the app
  // silhouette instead of flashing blank. This never runs on the server render
  // (likelySession is false until after mount) and never for anon (no cookie).
  if (!resolved && likelySession) {
    return <AppShellSkeleton>{children}</AppShellSkeleton>
  }

  // No session (anon, crawler, or the check resolved empty) → the ISR body
  // stands alone, byte-identical to the cached render.
  return <>{children}</>

  function renderFrame(data: ConnectedShellData) {
    return (
      <AppShellFrame
        user={{
          displayName: data.user.displayName,
          username: data.user.username,
          avatarUrl: data.user.avatarUrl,
        }}
        userId={data.user.id}
        locale={locale}
        saveTargets={data.saveTargets}
        subcategoriesByTopic={data.subcategoriesByTopic}
        unreadCount={data.unreadCount}
        themePreference={data.themePreference}
      >
        {children}
      </AppShellFrame>
    )
  }
}
