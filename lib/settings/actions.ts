'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupportedLocale, routing } from '@/lib/i18n/routing'

/**
 * Account Settings Server Actions (chantier 13, spec §8.14).
 *
 * All run authenticated; each re-derives the user from the session (never trusts
 * a client-passed id) and writes through RLS with the caller's session — same
 * contract as the onboarding/collections actions. The one exception is
 * deleteAccount, which needs the service-role admin client to remove the
 * auth.users row (which cascades the whole DB) and to purge Storage objects.
 *
 * Result shape mirrors the rest of the app: `{ ok: true }` or
 * `{ ok: false, error: code }` so the client localizes the message.
 */

type Err =
  | 'unauthenticated'
  | 'invalid'
  | 'username_taken'
  | 'server'
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

// ── Profile edit ─────────────────────────────────────────────────────────────

// Constraints transcribed from the users table (migration 0002):
//   username  ~ '^[a-z0-9_]{3,20}$'
//   bio       char_length(bio) <= 160
const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const BIO_MAX = 160
const DISPLAY_NAME_MAX = 80 // display_name is `text not null` — cap defensively
const LOCATION_MAX = 120
const WEBSITE_MAX = 300

function cleanDisplayName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t.length < 1 || t.length > DISPLAY_NAME_MAX) return null
  return t
}

/** Optional free-text: '' → null (cleared), too-long → truncated, else trimmed. */
function cleanOptional(input: unknown, max: number): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t.length === 0) return null
  return t.length > max ? t.slice(0, max) : t
}

/**
 * Only accept an avatar URL that points at our own public 'avatars' Storage
 * bucket — never an arbitrary external URL (an open image-embed vector that also
 * would not match next.config's remotePatterns). '' / null clears the avatar.
 */
function cleanAvatarUrl(input: unknown): string | null | undefined {
  if (input === undefined) return undefined // leave unchanged
  if (input === null || input === '') return null
  if (typeof input !== 'string') return undefined
  if (!input.includes('/storage/v1/object/public/avatars/')) return undefined
  return input
}

export type UpdateProfileInput = {
  displayName?: string
  username?: string
  bio?: string | null
  location?: string | null
  websiteUrl?: string | null
  /** Public URL from an 'avatars' bucket upload; '' clears, undefined leaves. */
  avatarUrl?: string | null
}

/**
 * Edit the signed-in user's profile (§8.14 Profile — closes the chantier 9
 * "edit profile deferred" loop). Only provided fields change. Username is
 * validated against the DB regex AND checked for uniqueness up-front so the user
 * gets a clean "taken" message rather than an opaque 500 from the unique
 * constraint. The write still goes through RLS (users_update_own), so a user can
 * only edit their own row regardless of what the client sends.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const supabase = await createClient()
  const patch: Record<string, unknown> = {}

  if (input.displayName !== undefined) {
    const displayName = cleanDisplayName(input.displayName)
    if (!displayName) return { ok: false, error: 'invalid' }
    patch.display_name = displayName
  }

  if (input.username !== undefined) {
    const username = input.username.trim().toLowerCase()
    if (!USERNAME_RE.test(username)) return { ok: false, error: 'invalid' }
    // Uniqueness pre-check (case-insensitive not needed — the regex forces
    // lowercase). Skip the query when the handle is unchanged.
    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (lookupErr) {
      console.error('updateProfile: username lookup failed', {
        message: lookupErr.message,
      })
      return { ok: false, error: 'server' }
    }
    if (existing && existing.id !== userId) {
      return { ok: false, error: 'username_taken' }
    }
    patch.username = username
  }

  if (input.bio !== undefined) patch.bio = cleanOptional(input.bio, BIO_MAX)
  if (input.location !== undefined) {
    patch.location = cleanOptional(input.location, LOCATION_MAX)
  }
  if (input.websiteUrl !== undefined) {
    patch.website_url = cleanOptional(input.websiteUrl, WEBSITE_MAX)
  }
  const avatarUrl = cleanAvatarUrl(input.avatarUrl)
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
  if (error) {
    // A race on the unique constraint (someone took the handle between the
    // pre-check and the write) surfaces as a unique violation — map it back to
    // the clean "taken" error rather than a generic server error.
    if (error.code === '23505') return { ok: false, error: 'username_taken' }
    console.error('updateProfile: update failed', { message: error.message })
    return { ok: false, error: 'server' }
  }

  revalidatePath('/[locale]/my-space', 'page')
  revalidatePath('/[locale]/settings', 'page')
  if (typeof patch.username === 'string') {
    revalidatePath(`/[locale]/profile/${patch.username}`, 'page')
  }
  return { ok: true }
}

// ── Language preference ──────────────────────────────────────────────────────

/**
 * Persist the user's UI language preference (users.language). The actual locale
 * SWITCH (navigating to the /en or /fr URL) is done client-side via next-intl —
 * this action only records the preference so it survives across sessions/devices.
 * Validated against the DB check ('en' | 'fr').
 */
export async function updateLanguage(language: string): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (language !== 'en' && language !== 'fr') {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({ language })
    .eq('id', userId)
  if (error) {
    console.error('updateLanguage: update failed', { message: error.message })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}

// ── Delete account (RGPD purge) ──────────────────────────────────────────────

/** Buckets that key objects under the '<uid>/…' owner prefix (0010/0011/0013). */
const OWNER_SCOPED_BUCKETS = ['avatars', 'collection-covers', 'user-images']

/**
 * Best-effort purge of every Storage object under the user's '<uid>/' prefix in
 * each owner-scoped bucket. Storage objects are NOT reached by the DB FK cascade
 * (they live in storage.objects, keyed by a path string, not an FK to users), so
 * without this an account delete would orphan the user's uploaded images. Runs
 * with the admin client so it works regardless of the (already torn-down) user
 * session. Failures are logged but do not abort the account deletion — a leftover
 * image is far less bad than a half-deleted account.
 */
async function purgeUserStorage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  for (const bucket of OWNER_SCOPED_BUCKETS) {
    const { data: objects, error: listErr } = await admin.storage
      .from(bucket)
      .list(userId, { limit: 1000 })
    if (listErr) {
      console.error('deleteAccount: storage list failed', {
        bucket,
        message: listErr.message,
      })
      continue
    }
    if (!objects || objects.length === 0) continue
    const paths = objects.map((o) => `${userId}/${o.name}`)
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths)
    if (rmErr) {
      console.error('deleteAccount: storage remove failed', {
        bucket,
        message: rmErr.message,
      })
    }
  }
}

/**
 * Delete the signed-in user's account and all their data (§8.14 "Delete account"
 * → purge complète RGPD). Order matters:
 *   1. Purge Storage (not FK-cascaded) under the user's owner prefix.
 *   2. admin.auth.admin.deleteUser(userId) — removes the auth.users row, which
 *      cascades through public.users (id references auth.users on delete cascade)
 *      and every table that references public.users on delete cascade
 *      (user_topics, collections→sections, projects, user_links, follows, …).
 *      consent_logs.user_id is ON DELETE SET NULL by design (the consent journal
 *      must survive the account for RGPD auditability — data model / migration
 *      0002), so those rows are anonymised, not destroyed.
 *   3. Sign out locally so the browser's auth cookies are cleared immediately
 *      (the deleted session is already invalid server-side; this tidies cookies
 *      so the next request is cleanly anonymous).
 *
 * Returns the locale-safe home path so the client can hard-redirect out of the
 * now-deleted session.
 */
export async function deleteAccount(
  locale: string,
): Promise<Result<{ redirectTo: string }>> {
  const safeLocale = isSupportedLocale(locale) ? locale : routing.defaultLocale

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }
  const userId = user.id

  const admin = createAdminClient()

  // 1. Storage first — if the DB row is gone we lose the ability to enumerate
  //    the prefix cleanly; the prefix is just the uid, so it's stable either way,
  //    but doing storage first keeps the "still exists" invariant simplest.
  await purgeUserStorage(admin, userId)

  // 2. Delete the auth user → cascades the entire DB graph.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId)
  if (delErr) {
    console.error('deleteAccount: auth deleteUser failed', {
      userId,
      message: delErr.message,
    })
    return { ok: false, error: 'server' }
  }

  // 3. Clear the local session cookies (the session is already invalid).
  await supabase.auth.signOut().catch((err) => {
    // Non-fatal: the account is gone; a stale cookie is harmless and the next
    // authenticated request will fail cleanly. Log and move on.
    console.warn('deleteAccount: local signOut after delete failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  })

  return { ok: true, redirectTo: `/${safeLocale}` }
}
