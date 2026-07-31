import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { ArrowRight, Compass } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { Avatar } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { AppHeader } from '@/components/app/app-header'
import { StatList } from '@/components/app/stat-list'
import { HomeFeedClient } from '@/components/app/home/home-feed-client'
import { CreateCollectionCta } from '@/components/app/home/create-collection-cta'
import {
  getCurrentUser,
  getUserTopics,
  getFollowedCurators,
  getMySpaceStats,
} from '@/lib/app/data'
import {
  getFollowingFeed,
  getForYouFeed,
  getTrendingFeed,
  getRecentCuratorActivity,
} from '@/lib/home/data'
import { getActiveCoreTopics } from '@/lib/onboarding/data'

/**
 * /[locale]/home — the connected personalised feed (spec §8.2, chantier 12,
 * last of Phase 3). A protected route: middleware redirects logged-out visitors
 * to Welcome. Replaces the Phase-3 placeholder.
 *
 * Structure: greeting header → Topic filters + Following/For you/Trending tabs +
 * "Picked for you" grid (HomeFeedClient) → "From your curators" activity →
 * "Continue exploring" suggestive tags, with a right sidebar (My Universe
 * miniature, stats, curators you follow, "Create a collection"). All feeds are
 * deterministic server queries — no engagement-scored reco (Decisions §5quater).
 * Empty account → designed empty states, never fake seeding.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Home' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: meta('defaultDescription'),
    siteName: meta('siteName'),
    path: '/home',
    noindex: true,
  })
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route; bounce to Welcome if the session lapsed
  // mid-request rather than render a broken shell.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Home' })

  const [
    coreTopics,
    userTopics,
    following,
    forYou,
    trending,
    activity,
    curators,
    stats,
  ] = await Promise.all([
    // Filter row is the fixed All + 10 Core Topics nav (spec §8.2), NOT the
    // user's chosen subset.
    getActiveCoreTopics(locale),
    // "Continue exploring" tags are suggestive, driven by the user's own Topics.
    getUserTopics(user.id, locale),
    getFollowingFeed(user.id),
    getForYouFeed(user.id),
    getTrendingFeed(),
    getRecentCuratorActivity(user.id),
    getFollowedCurators(user.id, 6),
    getMySpaceStats(user.id),
  ])

  const dateFmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }}
      userId={user.id}
      locale={locale}
    >
      <AppHeader displayName={user.displayName} />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-2xl px-lg py-2xl lg:grid-cols-[1fr_18rem] lg:px-2xl">
        {/* Main column. */}
        <div className="flex min-w-0 flex-col gap-2xl">
          <HomeFeedClient
            following={following}
            forYou={forYou}
            trending={trending}
            topics={coreTopics}
          />

          {/* From your curators — recent activity from follows. */}
          <section className="flex flex-col gap-lg">
            <h2 className="font-serif text-h2 text-foreground">
              {t('fromYourCurators')}
            </h2>
            {activity.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border-light">
                {activity.map((a) => (
                  <li key={a.collectionId}>
                    <Link
                      href={`/collections/${a.slug}`}
                      className="flex items-center gap-md rounded-md px-sm py-md transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                    >
                      <Avatar
                        src={a.curator.avatarUrl ?? undefined}
                        name={a.curator.displayName}
                        size="md"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-sans text-body-small text-foreground">
                          {t('curatorPublished', {
                            name: a.curator.displayName,
                            collection: a.collectionTitle,
                          })}
                        </span>
                        <span className="truncate font-sans text-meta text-foreground/50">
                          @{a.curator.username}
                        </span>
                      </span>
                      <span className="shrink-0 font-sans text-meta text-foreground/40">
                        {dateFmt.format(new Date(a.createdAt))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-border-light bg-foreground/[0.02] px-lg py-xl text-center font-sans text-body-small text-foreground/60">
                {t('curatorsActivityEmpty')}
              </p>
            )}
          </section>

          {/* Continue exploring — suggestive tags from the user's Topics. */}
          {userTopics.length > 0 ? (
            <section className="flex flex-col gap-lg">
              <h2 className="font-serif text-h2 text-foreground">
                {t('continueExploring')}
              </h2>
              <div className="flex flex-wrap gap-sm">
                {userTopics.map((tp) => (
                  <Link
                    key={tp.id}
                    href="/explore"
                    className="inline-flex items-center gap-xs rounded-full border border-border-light px-md py-sm font-sans text-body-small text-foreground/70 transition-colors hover:border-violet hover:bg-violet/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                  >
                    <Compass className="size-3.5 text-violet" aria-hidden />
                    {tp.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Right sidebar — My Universe miniature, stats, curators, create CTA. */}
        <aside className="flex flex-col gap-xl">
          {/* My Universe miniature + create CTA. */}
          <section className="flex flex-col gap-md rounded-lg border border-border-light bg-violet-soft/10 p-lg">
            <Link
              href="/my-space"
              className="group flex items-center gap-md rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
            >
              <Avatar
                src={user.avatarUrl ?? undefined}
                name={user.displayName}
                size="lg"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-serif text-h3 text-foreground">
                  {user.universeName ?? t('myUniverse')}
                </span>
                <span className="inline-flex items-center gap-xs font-sans text-meta text-violet transition-opacity group-hover:opacity-80">
                  {t('viewMyUniverse')}
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </span>
            </Link>
            <CreateCollectionCta
              userId={user.id}
              locale={locale}
              className="w-full justify-center"
            />
          </section>

          {/* Stats. */}
          <section className="rounded-lg border border-border-light bg-foreground/[0.02] p-lg">
            <h2 className="mb-md font-serif text-h3 text-foreground">
              {t('universeInNumbers')}
            </h2>
            <StatList
              stats={[
                { label: t('statSavedLinks'), value: stats.savedLinks },
                { label: t('statCollections'), value: stats.collections },
                {
                  label: t('statCuratorsFollowed'),
                  value: stats.curatorsFollowed,
                },
              ]}
            />
          </section>

          {/* Curators you follow. */}
          <section className="flex flex-col gap-md rounded-lg border border-border-light bg-foreground/[0.02] p-lg">
            <h2 className="font-serif text-h3 text-foreground">
              {t('curatorsYouFollow')}
            </h2>
            {curators.length > 0 ? (
              <ul className="flex flex-col gap-sm">
                {curators.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/profile/${c.username}`}
                      className="flex items-center gap-sm rounded-md py-2xs transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                    >
                      <Avatar
                        src={c.avatarUrl ?? undefined}
                        name={c.displayName}
                        size="sm"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-sans text-body-small text-foreground">
                          {c.displayName}
                        </span>
                        <span className="truncate font-sans text-meta text-foreground/50">
                          @{c.username}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-sm">
                <p className="font-sans text-body-small text-foreground/60">
                  {t('curatorsYouFollowEmpty')}
                </p>
                <Link
                  href="/curators"
                  className="inline-flex items-center gap-xs font-sans text-body-small font-medium text-violet transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                >
                  {t('browseCurators')}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
