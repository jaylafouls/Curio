import type { MetadataRoute } from 'next'
import { LOCALES, SITE_URL } from '@/lib/seo/config'

/**
 * robots.txt (SEO-native, brief rule 1 + chantier SEO part 2).
 *
 * Public indexation by default. Explicitly disallow the private / connected-only
 * areas so they never leak into the index — both the routes behind the auth
 * middleware (see PROTECTED_SEGMENTS in lib/supabase/middleware.ts: home,
 * onboarding) and the connected-app areas that will land in later chantiers
 * (my-space, projects, settings).
 *
 * Because localePrefix is 'always' (/en/..., /fr/...), each private segment is
 * disallowed under every locale prefix, plus a bare (prefix-less) form as a
 * belt-and-braces guard against any un-prefixed hit.
 */

// Segments after the locale prefix that must never be indexed. Keep in sync
// with PROTECTED_SEGMENTS in the auth middleware; the extras (my-space,
// projects, settings) are reserved for the connected app.
const PRIVATE_SEGMENTS = [
  'home',
  'onboarding',
  'my-space',
  'projects',
  'settings',
  'analytics',
  'notifications',
] as const

/** All locale-prefixed + bare path forms to disallow for a segment. */
function disallowPaths(): string[] {
  const paths = new Set<string>()
  for (const segment of PRIVATE_SEGMENTS) {
    paths.add(`/${segment}`)
    for (const locale of LOCALES) {
      paths.add(`/${locale}/${segment}`)
    }
  }
  return [...paths]
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: disallowPaths(),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
