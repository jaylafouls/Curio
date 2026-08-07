import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Bookmark, FolderTree, Users, Sparkles } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { JsonLd, buildCollectionPage } from '@/lib/seo/json-ld'
import { SITE_URL } from '@/lib/seo/config'
import { checkInvitationToken } from '@/lib/auth/invitation'
import { AccentText, Avatar, Badge, CollectionCard } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { PublicShell } from '@/components/public/public-shell'
import { OrbitalViz } from '@/components/public/orbital-viz'
import { getPublicTopics, getPublicCollections } from '@/lib/public/data'

type PageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ token?: string }>
}

/**
 * Landing / — the public marketing home (spec §8.1). Replaces the earlier
 * minimal Welcome screen while PRESERVING its invitation-token behaviour: a
 * valid `?token=` still forwards to /signup?token= for redemption; an invalid
 * one is dropped (visitor proceeds as a normal Découvreur).
 *
 * Light Archive surface (the authoritative high-res landing mockup is light,
 * not Cosmic) — see D on the spec-text-vs-mockup conflict. Rendered inside the
 * shared PublicShell (header + footer). generateMetadata per brief rule 1.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Landing' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '',
  })
}

// Static press wordmarks (spec §8.1 social proof). Text, not logo assets — no
// binary to commit; on-brand type. These are illustrative press mentions.
const PRESS = [
  'Monocle',
  'Kinfolk',
  'Sight Unseen',
  'The New York Times',
  'Apartamento',
  'Vogue',
] as const

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('Landing')

  // Invitation token (preserved from the old Welcome): valid → forward to
  // signup with the token; invalid → dropped. Absent → nothing.
  const tokenState = await checkInvitationToken(token)
  const signupHref =
    tokenState === 'valid' ? `/signup?token=${token}` : '/signup'

  const [topics, collections] = await Promise.all([
    getPublicTopics(locale),
    getPublicCollections(5),
  ])

  const values = [
    { icon: Bookmark, key: 'collect' },
    { icon: FolderTree, key: 'organize' },
    { icon: Users, key: 'discover' },
    { icon: Sparkles, key: 'keep' },
  ] as const

  return (
    <PublicShell>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-lg pt-2xl pb-xl sm:pt-3xl">
        <div className="flex flex-col items-center gap-lg text-center">
          <span className="font-sans text-meta font-medium uppercase tracking-widest text-foreground/50">
            {t('eyebrow')}
          </span>
          <AccentText
            before={t('titleBefore')}
            accent={t('titleAccent')}
            size="display"
            as="h1"
            className="max-w-3xl text-balance"
          />
          <p className="max-w-xl font-sans text-body text-foreground/70">
            {t('subtitle')}
          </p>

          {tokenState === 'invalid' ? (
            <p
              role="status"
              className="max-w-sm font-sans text-body-small text-foreground/60"
            >
              {t('invalidToken')}
            </p>
          ) : null}

          <div className="mt-sm flex flex-col items-center gap-sm sm:flex-row">
            <Link
              href={signupHref}
              className="inline-flex h-11 items-center gap-sm rounded-full bg-[var(--button-primary)] px-lg font-sans text-body-small font-medium text-[var(--button-text)] transition-colors duration-base hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
            >
              {t('ctaBuild')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/explore"
              className="inline-flex h-11 items-center gap-sm rounded-full border border-border px-lg font-sans text-body-small text-foreground/80 transition-colors duration-base hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
            >
              {t('ctaExplore')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Orbital visualisation — You + Core Topics. */}
        <div className="mt-2xl sm:mt-3xl">
          <OrbitalViz topics={topics} />
        </div>
      </section>

      {/* ── Social proof + press ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-lg py-xl">
        <div className="flex flex-col items-center gap-md">
          <div className="flex items-center gap-md">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D', 'E'].map((seed) => (
                <Avatar key={seed} name={seed} size="sm" />
              ))}
            </div>
            <p className="font-sans text-body-small text-foreground/70">
              {t('socialProof')}
            </p>
          </div>

          <ul className="mt-md flex flex-wrap items-center justify-center gap-x-xl gap-y-md">
            {PRESS.map((name) => (
              <li
                key={name}
                className="font-serif text-body text-foreground/40 transition-colors hover:text-foreground/70"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Explore inspiring universes ──────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-sm">
            <AccentText
              before={t('universesBefore')}
              accent={t('universesAccent')}
              size="h1"
              as="h2"
            />
            <p className="max-w-xl font-sans text-body text-foreground/70">
              {t('universesSubtitle')}
            </p>
          </div>

          {collections.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <div key={c.id}>
                    <JsonLd
                      data={buildCollectionPage({
                        name: c.title,
                        url: `${SITE_URL}/${locale}/collections/${c.slug}`,
                        description: c.description ?? undefined,
                        image: c.cover ?? undefined,
                        author: {
                          name: c.owner.name,
                          url: `${SITE_URL}/${locale}/profile/${c.owner.username}`,
                        },
                      })}
                    />
                    <Link
                      href={`/collections/${c.slug}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
                    >
                      <CollectionCard
                        title={c.title}
                        topic={c.topic}
                        cover={c.cover ?? undefined}
                        owner={{
                          name: c.owner.name,
                          avatar: c.owner.avatar ?? undefined,
                        }}
                        linksCount={c.linksCount}
                      />
                    </Link>
                  </div>
                ))}
              </div>
              <div>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-xs font-sans text-body-small font-medium text-violet transition-colors hover:opacity-80"
                >
                  {t('universesCta')}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </>
          ) : (
            // Empty state — 0 public collections in prod. Graceful, no fake seeding.
            <div className="flex flex-col items-center gap-md rounded-lg border border-border bg-foreground/[0.02] px-lg py-3xl text-center">
              <Badge topic="ideas">{t('universesEmptyTag')}</Badge>
              <h3 className="font-serif text-h3 text-foreground">
                {t('universesEmptyTitle')}
              </h3>
              <p className="max-w-md font-sans text-body-small text-foreground/70">
                {t('universesEmptyBody')}
              </p>
              <Link
                href={signupHref}
                className="mt-xs inline-flex h-11 items-center gap-sm rounded-full bg-[var(--button-primary)] px-lg font-sans text-body-small font-medium text-[var(--button-text)] transition-colors hover:opacity-90"
              >
                {t('ctaBuild')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
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
    </PublicShell>
  )
}
