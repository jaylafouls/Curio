import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { AccentText, ButtonLink } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'

type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'About' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/about',
  })
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'About' })

  const content = (
    <>
      {/* Vision */}
      <section className="mx-auto w-full max-w-3xl px-lg py-3xl text-center">
        <span className="font-sans text-meta font-medium uppercase tracking-widest text-foreground/50">
          {t('eyebrow')}
        </span>
        <div className="mt-md">
          <AccentText
            before={t('missionBefore')}
            accent={t('missionAccent')}
            size="display"
            as="h1"
            className="text-balance"
          />
        </div>
        <p className="mx-auto mt-lg max-w-xl font-sans text-body leading-relaxed text-foreground/70">
          {t('intro')}
        </p>
      </section>

      {/* Manifesto */}
      <section className="mx-auto w-full max-w-3xl px-lg pb-2xl">
        <div className="flex flex-col gap-lg rounded-lg border border-border bg-foreground/[0.02] p-2xl">
          <h2 className="font-serif text-h2 text-foreground">
            {t('manifestoTitle')}
          </h2>
          <div className="flex flex-col gap-md font-sans text-body leading-relaxed text-foreground/70">
            <p>{t('manifestoP1')}</p>
            <p>{t('manifestoP2')}</p>
            <p>{t('manifestoP3')}</p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
        <h2 className="mb-xl font-serif text-h2 text-foreground">
          {t('principlesTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {(['human', 'curiosity', 'curated', 'lasting', 'openness', 'craft'] as const).map((key) => (
            <div key={key} className="flex flex-col gap-sm">
              <h3 className="font-serif text-h3 text-foreground">
                {t(`principles.${key}.title`)}
              </h3>
              <p className="font-sans text-body-small text-foreground/70">
                {t(`principles.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-3xl px-lg py-3xl text-center">
        <AccentText
          before={t('ctaBefore')}
          accent={t('ctaAccent')}
          size="h1"
          as="h2"
          className="text-balance"
        />
        <div className="mt-lg flex justify-center">
          <ButtonLink
            href="/signup"
            iconRight={<ArrowRight className="size-4" />}
          >
            {t('cta')}
          </ButtonLink>
        </div>
      </section>
    </>
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
