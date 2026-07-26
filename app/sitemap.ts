import type { MetadataRoute } from 'next'
import { LOCALES, SITE_URL } from '@/lib/seo/config'

/**
 * sitemap.xml (SEO-native, brief rule 1). Currently lists the locale homes
 * with hreflang alternates. Dynamic entries (curators, collections) are added
 * from the DB once those chantiers land — the structure is ready now.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${SITE_URL}/${l}`]),
      ),
    },
  }))
}
