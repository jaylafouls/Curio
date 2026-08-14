import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { JsonLd, buildPerson } from '@/lib/seo/json-ld'
import { SITE_URL } from '@/lib/seo/config'
import { AccentText, ButtonLink } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import { PublicShell } from '@/components/public/public-shell'
import { EmptyState } from '@/components/public/empty-state'
import { getPublicCurators, getPublicTopics } from '@/lib/public/data'
import { CuratorsGrid } from './curators-grid'

/**
 * /[locale]/curators — the curator directory (spec §8.4): "Meet the curious
 * minds", topic filters, and a curator grid. Production has NO Founding Curator
 * recruited yet, so the page shows the designed coming-soon empty state (the
 * D002 pattern reused from onboarding) — never fake curators.
 *
 * When curators exist, each emits a Person JSON-LD node (closing the loop left
 * open by the SEO chantier, which built buildPerson for exactly this page).
 * generateMetadata per brief rule 1.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Curators' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/curators',
  })
}

export default async function CuratorsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Curators' })
  const [curators, topics] = await Promise.all([
    getPublicCurators(24),
    getPublicTopics(locale),
  ])

  return (
    <PublicShell>
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

        {curators.length > 0 ? (
          <>
            {/* Person structured data for each curator (SEO chantier loop closed). */}
            {curators.map((c) => (
              <JsonLd
                key={c.id}
                data={buildPerson({
                  name: c.displayName,
                  url: `${SITE_URL}/${locale}/profile/${c.username}`,
                  image: c.avatarUrl ?? undefined,
                  description: c.bio ?? undefined,
                  username: c.username,
                })}
              />
            ))}
            <CuratorsGrid curators={curators} topics={topics} />
          </>
        ) : (
          <EmptyState
            tag={t('emptyTag')}
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={
              <ButtonLink
                href="/signup"
                iconRight={<ArrowRight className="size-4" />}
              >
                {t('joinCta')}
              </ButtonLink>
            }
          />
        )}
      </section>
    </PublicShell>
  )
}
