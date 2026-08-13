import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { AccentText, Avatar, PageContainer } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { AppPageTitle } from '@/components/app/app-header'
import { ProfileIdentity } from '@/components/app/profile-identity'
import { CollectionGrid } from '@/components/app/collection-grid'
import { StatList } from '@/components/app/stat-list'
import { UniverseOrbital } from '@/components/app/universe-orbital'
import { EmptyState } from '@/components/public/empty-state'
import {
  getCurrentUser,
  getUserTopics,
  getMyCollections,
  getFollowedCurators,
  getMySpaceStats,
} from '@/lib/app/data'
import { getMyUniverse } from '@/lib/universe/data'
import { getUserPlan } from '@/lib/plans/data'

/**
 * /[locale]/my-space — the signed-in user's own space (spec §8.9). A protected
 * route (middleware redirects logged-out visitors to Welcome). Read-only this
 * chantier: identity, active Topics, latest collections, curators followed, and
 * "your universe in numbers". Writes (edit profile, create collection) land in
 * later chantiers; empty states cover a fresh account — no fake seeding.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'MySpace' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/my-space',
    noindex: true,
  })
}

export default async function MySpacePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route, but if the session lapsed mid-request, bounce
  // to Welcome rather than render a broken shell.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'MySpace' })
  const tPlan = await getTranslations({ locale, namespace: 'PlanBadge' })
  const tUniverse = await getTranslations({ locale, namespace: 'MyUniverse' })

  const [topics, collections, curators, stats, plan, universe] =
    await Promise.all([
      getUserTopics(user.id, locale),
      getMyCollections(user.id, 6),
      getFollowedCurators(user.id, 8),
      getMySpaceStats(user.id),
      getUserPlan(user.id),
      getMyUniverse(),
    ])

  const joinedLabel = t('joined', {
    date: new Date(user.createdAt).toLocaleDateString(
      locale === 'fr' ? 'fr-FR' : 'en-US',
      { month: 'long', year: 'numeric' },
    ),
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
      header={<AppPageTitle title={t('pageTitle')} />}
    >
      <PageContainer
        size="6xl"
        className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_18rem]"
      >
        {/* Main column. */}
        <div className="flex min-w-0 flex-col gap-xl">
          {/* My Universe — the real interactive orbital view (§7.5). Hero of the
              page: You at the centre with your Projects and standalone
              Collections in orbit, each a real navigable node. Empty universe
              (fresh account) shows its designed empty state, no fake seeding. */}
          <section className="flex flex-col gap-lg">
            <div className="flex flex-col gap-2xs">
              <h2 className="font-serif text-h2 text-foreground">
                {tUniverse('title')}
              </h2>
              <p className="font-sans text-body-small text-foreground/60">
                {tUniverse('subtitle')}
              </p>
            </div>
            {universe.nodes.length > 0 ? (
              <div className="rounded-lg border border-border bg-foreground/[0.02] px-lg py-xl">
                <UniverseOrbital
                  nodes={universe.nodes}
                  centerLabel={tUniverse('you')}
                />
              </div>
            ) : (
              <EmptyState
                tag={tUniverse('emptyTag')}
                title={tUniverse('emptyTitle')}
                body={tUniverse('emptyBody')}
                action={
                  <Link
                    href="/projects"
                    className="inline-flex h-11 items-center gap-sm rounded-full bg-[var(--button-primary)] px-lg font-sans text-body-small font-medium text-[var(--button-text)] transition-colors hover:opacity-90"
                  >
                    {tUniverse('emptyCta')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              />
            )}
          </section>

          <ProfileIdentity
            displayName={user.displayName}
            username={user.username}
            avatarUrl={user.avatarUrl}
            bio={user.bio}
            location={user.location}
            websiteUrl={user.websiteUrl}
            joinedLabel={joinedLabel}
            planBadge={plan.badge}
            planBadgeLabel={plan.badge === 'pro' ? tPlan('pro') : tPlan('founding')}
            topics={topics}
          />

          {/* Your latest collections. */}
          <section className="flex flex-col gap-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-h2 text-foreground">
                {t('latestCollections')}
              </h2>
            </div>
            {collections.length > 0 ? (
              <CollectionGrid collections={collections} />
            ) : (
              <EmptyState
                tag={t('collectionsEmptyTag')}
                title={t('collectionsEmptyTitle')}
                body={t('collectionsEmptyBody')}
              />
            )}
          </section>

          {/* Curators you follow. */}
          <section className="flex flex-col gap-lg">
            <h2 className="font-serif text-h2 text-foreground">
              {t('curatorsYouFollow')}
            </h2>
            {curators.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border">
                {curators.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/profile/${c.username}`}
                      className="flex items-center gap-md rounded-md px-sm py-md transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                    >
                      <Avatar
                        src={c.avatarUrl ?? undefined}
                        name={c.displayName}
                        size="md"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-sans text-body text-foreground">
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
              <EmptyState
                tag={t('curatorsEmptyTag')}
                title={t('curatorsEmptyTitle')}
                body={t('curatorsEmptyBody')}
                action={
                  <Link
                    href="/curators"
                    className="inline-flex h-11 items-center gap-sm rounded-full bg-[var(--button-primary)] px-lg font-sans text-body-small font-medium text-[var(--button-text)] transition-colors hover:opacity-90"
                  >
                    {t('curatorsEmptyCta')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              />
            )}
          </section>
        </div>

        {/* Sidebar — your universe in numbers. */}
        <aside className="flex flex-col gap-xl">
          <section className="rounded-lg border border-border bg-foreground/[0.02] p-lg">
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

          {/* "Your universe is unique" editorial banner (§7.5). */}
          <section className="flex flex-col items-center gap-sm rounded-lg border border-border bg-violet-soft/10 p-lg text-center">
            <AccentText
              before={t('uniqueBefore')}
              accent={t('uniqueAccent')}
              size="h3"
              as="h2"
            />
            <p className="font-sans text-body-small text-foreground/70">
              {t('uniqueBody')}
            </p>
            <Link
              href="/explore"
              className="mt-xs inline-flex items-center gap-xs font-sans text-body-small text-violet transition-colors hover:opacity-80"
            >
              {t('uniqueCta')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        </aside>
      </PageContainer>
    </AppShell>
  )
}
