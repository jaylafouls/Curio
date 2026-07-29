import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { LOCALES, SITE_URL } from '@/lib/seo/config'
import { requireSupabaseEnv } from '@/lib/supabase/env'

/**
 * sitemap.xml (SEO-native, brief rule 1 + chantier SEO part 3).
 *
 * Emits, with hreflang alternates for every locale:
 *  1. the locale homes (static, always present)
 *  2. every public profile — /[locale]/profile/[username] (spec §8.10)
 *
 * Public collections are intentionally NOT listed yet (decision D004): the
 * `collections` table has no slug column, and the live route/PK is uuid-based.
 * Indexing uuid URLs now would break URL stability the moment human-readable
 * slugs land. The query is written and held below — flip it on when a
 * `/collections/[slug]` route + slug column exist, no other change needed.
 *
 * Reads run against the ANON client: `users` is world-readable by RLS
 * (users_select_public `using (true)`), and a public sitemap must reflect
 * exactly what an anonymous crawler can see — so no service-role key is used.
 * The query returns an empty set today (no public profiles yet) and activates
 * automatically as profiles are created.
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
 * Public profiles from the DB. Anonymous-visible rows only (RLS enforces this
 * for us). `updated_at` drives lastModified so crawlers see accurate freshness.
 */
async function publicProfileEntries(): Promise<SitemapEntry[]> {
  const { url, anonKey } = requireSupabaseEnv()
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const homeEntries = entriesForPath('', now)
  const profileEntries = await publicProfileEntries()

  // Held until a slug column + /collections/[slug] route exist (decision D004):
  //
  //   const { data } = await supabase
  //     .from('collections')
  //     .select('slug, updated_at')
  //     .eq('is_public', true)
  //   const collectionEntries = (data ?? []).flatMap((row) =>
  //     entriesForPath(`/collections/${row.slug}`, new Date(row.updated_at)),
  //   )

  return [...homeEntries, ...profileEntries]
}
