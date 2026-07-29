import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo/config'
import './globals.css'

/**
 * App-wide default metadata (chantier SEO part 1). Every page delegates to
 * buildMetadata() for its own canonical/OG/hreflang, but this root default is
 * the safety net: any route that ships without its own generateMetadata still
 * gets a sane title, description and metadataBase rather than a bare document.
 *
 * `title.template` wraps page titles as "<page> · Curio"; `title.default` is
 * used when a page provides none. metadataBase makes every relative OG/canonical
 * URL absolute. Locale-specific copy is provided per-page via buildMetadata;
 * this default is intentionally locale-neutral (English base) since it only
 * shows for routes that have not localised their metadata.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Curio — The internet worth keeping',
    template: '%s · Curio',
  },
  description:
    'Curio is a curation social network. Save, organise and share the links worth keeping.',
}

/**
 * Passthrough root. With next-intl `localePrefix: 'always'`, every real page
 * lives under app/[locale], and that segment owns <html>/<body> so `lang`
 * matches the URL locale. Next requires a root layout to exist; this one only
 * forwards children. Global CSS is imported here so it applies app-wide.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
