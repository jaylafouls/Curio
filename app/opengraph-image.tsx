import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/seo/og-image'

/**
 * App-wide default Open Graph image (chantier SEO part 1, decision D003).
 *
 * Next serves this at /opengraph-image and injects og:image / twitter:image for
 * any route that doesn't provide its own. Rendered dynamically from the shared
 * branded template — no committed asset. Per-page/per-locale OG images can add
 * their own opengraph-image.tsx reusing renderOgImage() when copy should differ.
 */

export const alt = 'Curio — The internet worth keeping'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function OpengraphImage() {
  return renderOgImage({
    title: 'The internet worth keeping',
    subtitle: 'Save, organise and share the links worth keeping.',
  })
}
