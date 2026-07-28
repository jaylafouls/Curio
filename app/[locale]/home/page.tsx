import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { PlaceholderPage } from '@/lib/seo/placeholder-page'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/home — the connected personalised feed (Phase 3). Scaffold only.
 * This is the auth callback's destination for a returning user whose
 * onboarding_completed = true. A protected route: the middleware redirects
 * unauthenticated visitors back to the Welcome screen (§5).
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `Home · ${t('siteName')}`,
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: '/home',
  })
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <PlaceholderPage label="Home">
      <p className="font-sans text-body text-text-dark/70">
        Your personalised feed — scaffolded (Phase 3). Reached after auth when
        onboarding is complete.
      </p>
    </PlaceholderPage>
  )
}
