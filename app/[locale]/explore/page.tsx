import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { PlaceholderPage } from '@/lib/seo/placeholder-page'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/explore — public discovery feed (Phase 2). Scaffold only; the
 * Welcome screen's secondary "Explore" CTA links here so the route resolves
 * today with a stable, indexable URL. Real page built in Phase 2.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `Explore · ${t('siteName')}`,
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: '/explore',
  })
}

export default async function ExplorePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <PlaceholderPage label="Explore">
      <p className="font-sans text-body text-text-dark/70">
        Public discovery feed — scaffolded for stable URLs (Phase 2).
      </p>
    </PlaceholderPage>
  )
}
