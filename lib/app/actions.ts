'use server'

import { getCurrentUser } from './data'
import { getSaveTargets, type SaveTargetCollection } from '@/lib/links/data'
import {
  getSubcategoriesByTopic,
  type LinkSubcategory,
} from '@/lib/links/subcategories'
import { getUnreadNotificationCount } from '@/lib/notifications/data'
import { getThemePreference } from '@/lib/theme/data'
import type { ThemePreference } from '@/lib/theme/types'

/**
 * The data bundle the connected chrome needs — exactly the five inputs
 * <AppShellFrame> takes (the connected `user` shape, the Save Flow targets +
 * sub-categories, the unread bell count, the persisted theme).
 */
export type ConnectedShellData = {
  user: { id: string; displayName: string; username: string; avatarUrl: string | null }
  saveTargets: SaveTargetCollection[]
  subcategoriesByTopic: Record<string, LinkSubcategory[]>
  unreadCount: number
  themePreference: ThemePreference
}

/**
 * fetchConnectedShellData — a Server Action that returns the connected-chrome
 * bundle for the CALLER, or null when there is no session.
 *
 * This exists for the collection page's client shell (CollectionConnectedShell):
 * that page ships an ISR-cached, cookie-free body so crawlers and anonymous
 * visitors get identical cacheable HTML. The connected chrome (sidebar, top bar,
 * bell, Save Flow) therefore cannot be decided during that render — it must be
 * resolved AFTER hydration, per-user, off the cached path. This action is that
 * resolution: same pattern as fetchOwnerCollection (collections/actions.ts),
 * which already layers owner controls over the same cached body.
 *
 * The null-for-anon return is the security boundary: the caller is re-derived
 * from the session server-side (getCurrentUser reads the auth cookie here, in the
 * action, never in the cached page), so a logged-out visitor — and every crawler,
 * which never carries a session — gets null and no chrome. The five reads are the
 * same owner/public/RLS reads AppShell performs; nothing new is exposed.
 */
export async function fetchConnectedShellData(): Promise<ConnectedShellData | null> {
  const user = await getCurrentUser()
  if (!user) return null

  // Mirror AppShell's reads for the SAME user, so the client-mounted frame is
  // byte-identical to the server-rendered one on every other connected page.
  const [saveTargets, subcategoriesByTopic, unreadCount, themePreference] =
    await Promise.all([
      getSaveTargets(user.id),
      getSubcategoriesByTopic(),
      getUnreadNotificationCount(user.id),
      getThemePreference(),
    ])

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    },
    saveTargets,
    subcategoriesByTopic,
    unreadCount,
    themePreference,
  }
}
