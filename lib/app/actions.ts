'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUser,
  searchSavedLinks,
  type SavedScope,
  type SavedCursor,
  type SearchSavedLinksResult,
} from './data'
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

// ── /saved — server-driven search + Inbox→collection move ───────────────────

type Err = 'unauthenticated' | 'invalid' | 'server' | 'not_found'
type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: Err }

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** The client-supplied slice of a /saved search — never the user id. */
export type SavedSearchInput = {
  q?: string
  scope?: SavedScope
  topicId?: string | null
  subcategoryId?: string | null
  collectionId?: string | null
  tags?: string[] | null
  cursor?: SavedCursor | null
}

/**
 * searchSavedLinksAction — the /saved client's server entry point. Every filter
 * change and "load more" calls this; it re-derives the user from the session
 * (the client never passes a user id) and delegates to searchSavedLinks, so the
 * owner-RLS RPC only ever sees the caller's own saves. An empty result is a
 * legitimate answer (no matches); only an unauthenticated session is an error.
 */
export async function searchSavedLinksAction(
  input: SavedSearchInput,
): Promise<Result<{ result: SearchSavedLinksResult }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const result = await searchSavedLinks({
    userId,
    q: input.q,
    scope: input.scope,
    topicId: input.topicId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    collectionId: input.collectionId ?? null,
    tags: input.tags ?? null,
    cursor: input.cursor ?? null,
  })
  return { ok: true, result }
}

/**
 * moveToCollection — file an Inbox (Unsorted) save into a collection, or move it
 * between collections. This is a MOVE, not a copy: it updates the single
 * user_links row's collection_id in place, so the save leaves the Inbox but
 * stays in "All" and now appears in its collection — never duplicated, never
 * lost (locked model).
 *
 * Ownership is enforced two ways: the UPDATE runs under the caller's session
 * (user_links_update_owner RLS scopes it to auth.uid()'s rows), and the target
 * collection is verified to belong to the caller before the write. section_id is
 * always cleared on a move — the old section (if any) belonged to the old
 * collection, and the 0004 coherence trigger would reject a section that doesn't
 * match the new collection_id. A caller wanting a specific section passes a
 * sectionId that we verify belongs to the target collection first.
 */
export async function moveToCollection(
  userLinkId: string,
  collectionId: string | null,
  sectionId?: string | null,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (typeof userLinkId !== 'string' || userLinkId.length === 0) {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()

  // Target collection must be the caller's own (moving into someone else's
  // collection is nonsensical and the trigger/RLS would reject the section link
  // anyway). collectionId null = move back to the Inbox (Unsorted).
  if (collectionId !== null) {
    const { data: coll, error: collErr } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('owner_id', userId)
      .maybeSingle()
    if (collErr) {
      console.error('app: move target lookup failed', {
        message: collErr.message,
      })
      return { ok: false, error: 'server' }
    }
    if (!coll) return { ok: false, error: 'not_found' }
  }

  // Only keep a section_id if it was supplied AND belongs to the target
  // collection; otherwise clear it (the coherence trigger forbids a mismatch).
  let resolvedSectionId: string | null = null
  if (collectionId !== null && sectionId) {
    const { data: sec, error: secErr } = await supabase
      .from('sections')
      .select('id')
      .eq('id', sectionId)
      .eq('collection_id', collectionId)
      .maybeSingle()
    if (secErr) {
      console.error('app: move section lookup failed', {
        message: secErr.message,
      })
      return { ok: false, error: 'server' }
    }
    if (!sec) return { ok: false, error: 'invalid' }
    resolvedSectionId = sectionId
  }

  const { data: updated, error: updErr } = await supabase
    .from('user_links')
    .update({ collection_id: collectionId, section_id: resolvedSectionId })
    .eq('id', userLinkId)
    .eq('user_id', userId) // belt-and-braces with owner RLS
    .select('id')
    .maybeSingle()

  if (updErr) {
    console.error('app: move to collection failed', { message: updErr.message })
    return { ok: false, error: 'server' }
  }
  if (!updated) return { ok: false, error: 'not_found' }

  revalidatePath('/[locale]/saved', 'page')
  return { ok: true }
}
