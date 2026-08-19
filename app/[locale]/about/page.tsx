import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Heart, Compass, Gem, Sprout } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { AccentText, ButtonLink } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'
import { getGlobalStats } from '@/lib/public/data'

/**
 * /[locale]/about — the mission page (spec §8.6). Mission + the four brand
 * values (spec §1.7) + real global stats + the "Start your universe" CTA.
 *
 * Spec §8.6 also lists a Timeline (2022→Today) and a team section, but NO
 * concrete dates or team members are given anywhere in the spec. Rather than
 * invent names/dates (project non-negotiable: no fabricated content), those two
 * sections are intentionally omitted until real content is provided — flagged as
 * an open point. Everything shown here is either known-from-spec or a real stat.
 *
 * Stats are live head-counts (0 today, grow with the product) — never fabricated
 * marketing numbers. generateMetadata per brief rule 1.
 */
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
  const stats = await getGlobalStats()

  const values = [
    { icon: Heart, key: 'human' },
    { icon: Compass, key: 'curiosity' },
    { icon: Gem, key: 'curated' },
    { icon: Sprout, key: 'lasting' },
  ] as const

  const statItems = [
    { value: stats.curators, key: 'curators' },
    { value: stats.collections, key: 'collections' },
    { value: stats.links, key: 'links' },
  ] as const

  // Built once, handed to PublicConnectedShell twice: wrapped in <PublicShell>
  // for the server-rendered anon frame, and bare for the connected AppShellFrame
  // path. The wrapper picks one at runtime by session (same idiom as /explore).
  const content = (
    <>
      {/* Mission */}
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
        <p className="mx-auto mt-lg max-w-xl font-sans text-body text-foreground/70">
          {t('intro')}
        </p>
      </section>

      {/* Values */}
      <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
        <h2 className="mb-xl font-serif text-h2 text-foreground">
          {t('valuesTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, key }) => (
            <div key={key} className="flex flex-col gap-sm">
              <span className="flex size-11 items-center justify-center rounded-full bg-violet/10 text-violet">
                <Icon className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="font-serif text-h3 text-foreground">
                {t(`values.${key}.title`)}
              </h3>
              <p className="font-sans text-body-small text-foreground/70">
                {t(`values.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Global stats */}
      <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
        <div className="grid grid-cols-1 gap-lg rounded-lg border border-border bg-foreground/[0.02] p-2xl sm:grid-cols-3">
          {statItems.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-xs text-center">
              <span className="font-serif text-display text-foreground">
                {s.value}
              </span>
              <span className="font-sans text-body-small text-foreground/60">
                {t(`stats.${s.key}`)}
              </span>
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
