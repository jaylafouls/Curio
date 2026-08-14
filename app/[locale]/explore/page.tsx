import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { AccentText } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'
import {
  getPublicTopics,
  getPublicCollections,
  getPublicCurators,
} from '@/lib/public/data'
import { ExploreClient } from './explore-client'

/**
 * /[locale]/explore — public discovery feed (spec §8.3). Topic tabs over the
 * three feed sections (New & noteworthy / Explore by collections / Popular on
 * Curio). All data is anon-visible and empty today; the page renders its
 * designed empty states with no fake seeding. generateMetadata per brief rule 1.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Explore' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/explore',
  })
}

export default async function ExplorePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Explore' })
  const [topics, collections, curators] = await Promise.all([
    getPublicTopics(locale),
    getPublicCollections(24),
    getPublicCurators(6),
  ])

  // The page content, rendered once. It's handed to PublicConnectedShell twice:
  // bare (for the connected AppShellFrame path) and wrapped in <PublicShell> (the
  // server-rendered anon frame). The wrapper picks one at runtime by session.
  const content = (
    <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
      <header className="mb-xl flex flex-col gap-sm">
        <AccentText
          before={t('titleBefore')}
          accent={t('titleAccent')}
          size="h1"
          as="h1"
        />
        <p className="max-w-xl font-sans text-body text-foreground/70">
          {t('subtitle')}
        </p>
      </header>

      <ExploreClient
        topics={topics}
        collections={collections}
        curators={curators}
      />
    </section>
  )

  return (
    <PublicConnectedShell
      locale={locale}
      anon={<PublicShell>{content}</PublicShell>}
    >
      {content}
    </PublicConnectedShell>
  )
}
