import type { Metadata } from 'next'
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, SITE_URL } from './config'
import type { Locale } from '@/lib/i18n/routing'

type BuildMetadataInput = {
  locale: Locale
  title: string
  description: string
  siteName: string
  /**
   * Path WITHOUT the locale prefix, e.g. '/collections/tokyo-by-locals' or ''
   * for the locale home. Kept locale-free so hreflang alternates for every
   * locale are generated from one call — the core of "URLs stables".
   */
  path?: string
  images?: string[]
}

/**
 * Single reusable metadata builder every page's generateMetadata() delegates to
 * (brief rule 1). It guarantees, for free, on each page:
 *  - a canonical URL for the active locale
 *  - hreflang alternates for all locales + x-default
 *  - Open Graph + Twitter cards
 * so SEO is structural, not a post-launch checklist item.
 */
export function buildMetadata({
  locale,
  title,
  description,
  siteName,
  path = '',
  images,
}: BuildMetadataInput): Metadata {
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path
  const canonical = `${SITE_URL}/${locale}${normalizedPath}`

  // Default OG/Twitter image → the app-wide dynamic card (app/opengraph-image).
  // Next only auto-injects the file-convention image when a page provides NO
  // openGraph object; because every page sets one via this builder, we must wire
  // the image in explicitly or og:image would be missing everywhere. Pages can
  // still override by passing their own `images`.
  const resolvedImages = images ?? [`${SITE_URL}/opengraph-image`]

  // hreflang: one entry per locale, plus x-default pointing at the default.
  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}/${l}${normalizedPath}`
  }
  languages['x-default'] = `${SITE_URL}/${DEFAULT_LOCALE}${normalizedPath}`

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale] ?? OG_LOCALE[DEFAULT_LOCALE],
      images: resolvedImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: resolvedImages,
    },
  }
}
