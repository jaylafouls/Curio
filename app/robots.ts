import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/config'

/**
 * robots.txt (SEO-native, brief rule 1). Allows crawling and points at the
 * sitemap. Private/connected-only routes (e.g. /projects, /my-space) will be
 * disallowed as they are introduced in later chantiers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
