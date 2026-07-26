import { defineRouting } from 'next-intl/routing'

/**
 * Locale routing (brief §3): EN is the default, FR shipped in V1.
 *
 * `localePrefix: 'always'` keeps URLs stable and explicit (/en/..., /fr/...),
 * which matters for the SEO rule — one canonical URL per locale, no implicit
 * root that could double-index content.
 */
export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]

/** Narrowing guard for an arbitrary string against the supported locales. */
export function isSupportedLocale(value: string | undefined): value is Locale {
  return (
    value !== undefined &&
    (routing.locales as readonly string[]).includes(value)
  )
}
