import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { LOCALES, SITE_URL } from '@/lib/seo/config'
import { requireSupabaseEnv } from '@/lib/supabase/env'

/**
 * sitemap.xml (SEO-native, brief rule 1 + chantier SEO part 3).
 *
 * Emits, with hreflang alternates for every locale:
 *  1. the locale homes + the static public pages (explore/curators/editorial/
 *     about) — always present (chantier Pages publiques)
 *  2. every public profile — /[locale]/profile/[username] (spec §8.10)
 *  3. every public collection — /[locale]/collections/[slug]
 *
 * Collections are keyed by the `slug` column (migration 0008), not the uuid PK,
 * so the URLs are stable and human-readable. The real /collections/[slug] route
 * lands in a later chantier; this query is live now so the sitemap is ready the
 * moment public collections exist (decision D004).
 *
 * Reads run against the ANON client: `users` is world-readable by RLS
 * (users_select_public `using (true)`) and `collections` exposes only
 * is_public rows to anon (collections_select_public_or_owner). A public sitemap
 * must reflect exactly what an anonymous crawler can see — so no service-role
 * key is used. Both queries return an empty set today (no public rows yet) and
 * activate automatically as profiles/collections are created.
 */

// A public sitemap is a slow-changing, cacheable artifact; regenerate at most
// hourly rather than hitting the DB on every crawl. Next requires a static
// literal here, so this mirrors PUBLIC_PAGE_REVALIDATE (lib/seo/config.ts, part 6).
export const revalidate = 3600

type SitemapEntry = MetadataRoute.Sitemap[number]

/** hreflang alternates for a locale-free path (leading slash or ''). */
function localeAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`]),
  )
}

/** One sitemap entry per locale for a locale-free path, sharing alternates. */
function entriesForPath(path: string, lastModified: Date): SitemapEntry[] {
  const languages = localeAlternates(path)
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    alternates: { languages },
  }))
}

/**
 * Anon Supabase client — a public sitemap must reflect exactly what an
 * anonymous crawler can see, so reads go through RLS with the anon key (never
 * the service role). No session, no cookies: a request-scoped read client.
 */
function anonClient() {
  const { url, anonKey } = requireSupabaseEnv()
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Public profiles from the DB. Anonymous-visible rows only (RLS enforces this
 * for us). `updated_at` drives lastModified so crawlers see accurate freshness.
 */
async function publicProfileEntries(): Promise<SitemapEntry[]> {
  const { data, error } = await anonClient()
    .from('users')
    .select('username, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    // A sitemap must never 500 the whole route because the DB is momentarily
    // unreachable — degrade to the static entries and log for diagnosis.
    console.error('sitemap: failed to load public profiles', {
      message: error.message,
    })
    return []
  }

  return (data ?? []).flatMap((row) =>
    entriesForPath(`/profile/${row.username}`, new Date(row.updated_at)),
  )
}

/**
 * Public collections from the DB, keyed by slug (migration 0008). The anon
 * client only sees is_public rows (RLS), so the .eq('is_public', true) is a
 * belt-and-braces filter that also makes the intent explicit at the call site.
 */
async function publicCollectionEntries(): Promise<SitemapEntry[]> {
  const { data, error } = await anonClient()
    .from('collections')
    .select('slug, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('sitemap: failed to load public collections', {
      message: error.message,
    })
    return []
  }

  return (data ?? []).flatMap((row) =>
    entriesForPath(`/collections/${row.slug}`, new Date(row.updated_at)),
  )
}

// The static public marketing pages (chantier Pages publiques). Always
// present, always indexable — listed here so crawlers reach them directly.
const STATIC_PUBLIC_PATHS = [
  '',
  '/explore',
  '/curators',
  '/editorial',
  '/about',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries = STATIC_PUBLIC_PATHS.flatMap((path) =>
    entriesForPath(path, now),
  )
  const [profileEntries, collectionEntries] = await Promise.all([
    publicProfileEntries(),
    publicCollectionEntries(),
  ])

  return [...staticEntries, ...profileEntries, ...collectionEntries]
}
