import { routing } from '@/lib/i18n/routing'

/**
 * SEO base config (brief rule 1: SEO native from page one).
 *
 * The canonical origin drives absolute URLs in metadata (canonical + OG +
 * hreflang alternates). Set NEXT_PUBLIC_SITE_URL per environment (Vercel
 * provides the deploy URL); falls back to localhost in dev.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const LOCALES = routing.locales
export const DEFAULT_LOCALE = routing.defaultLocale

/** Maps our locale codes to BCP-47 / OG locale tags. */
export const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  fr: 'fr_FR',
}
