import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { PlaceholderPage } from '@/lib/seo/placeholder-page'
import type { Locale } from '@/lib/i18n/routing'

// ISR default for this high-traffic public page (chantier SEO part 6). The
// scaffold is static today; when the real profile lands it revalidates on this
// window instead of rendering per request. Next requires a static literal here,
// so this mirrors PUBLIC_PAGE_REVALIDATE (lib/seo/config.ts).
export const revalidate = 3600

/**
 * Stable public profile URL — /[locale]/profile/[username] (spec §8.10,
 * e.g. /en/profile/clara-martin). Scaffold only; the real profile page is
 * built in a later chantier. Distinct from /curators, which is the curator
 * directory (§8.4).
 */
type PageProps = {
  params: Promise<{ locale: Locale; username: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, username } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `@${username} · ${t('siteName')}`,
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: `/profile/${username}`,
  })
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale, username } = await params
  setRequestLocale(locale)
  return (
    <PlaceholderPage label={`Profile · @${username}`}>
      <p className="font-sans text-body text-text-dark/70">
        Public curator profile — scaffolded for stable URLs.
      </p>
    </PlaceholderPage>
  )
}
