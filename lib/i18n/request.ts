import { getRequestConfig } from 'next-intl/server'
import { routing, isSupportedLocale } from './routing'

/**
 * Per-request i18n config consumed by the next-intl plugin (next.config.ts).
 * Resolves the active locale from the [locale] segment, falling back to the
 * default, and loads the matching messages bundle.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = isSupportedLocale(requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
