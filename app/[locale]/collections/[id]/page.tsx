import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { PlaceholderPage } from '@/lib/seo/placeholder-page'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Stable public collection URL — /[locale]/collections/[id] (brief rule 1 +
 * spec §8.7, e.g. /en/collections/tokyo-by-locals). Scaffold only; the real
 * collection page is built in a later chantier.
 */
type PageProps = {
  params: Promise<{ locale: Locale; id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${id} · ${t('siteName')}`,
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: `/collections/${id}`,
  })
}

export default async function CollectionPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)
  return (
    <PlaceholderPage label={`Collection · ${id}`}>
      <p className="font-sans text-body text-text-dark/70">
        Public collection page — scaffolded for stable URLs.
      </p>
    </PlaceholderPage>
  )
}
