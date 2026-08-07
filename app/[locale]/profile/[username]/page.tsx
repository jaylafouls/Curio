import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PublicShell } from '@/components/public/public-shell'
import { ProfileIdentity } from '@/components/app/profile-identity'
import { CollectionGrid } from '@/components/app/collection-grid'
import { StatList } from '@/components/app/stat-list'
import { EmptyState } from '@/components/public/empty-state'
import {
  getProfileByUsername,
  getProfileStats,
  getPublicCollectionsByOwner,
} from '@/lib/app/data'
import { getUserPlan } from '@/lib/plans/data'

// ISR for this high-traffic public page (chantier SEO part 6). Revalidates on
// this window rather than rendering per request. Next requires a static literal;
// mirrors PUBLIC_PAGE_REVALIDATE (lib/seo/config.ts).
export const revalidate = 3600

/**
 * /[locale]/profile/[username] — a curator's PUBLIC profile (spec §8.10). Stays
 * public (no noindex): logged-out visitors and crawlers read it, so it goes in
 * the PublicShell, not the connected AppShell. Only public data is surfaced —
 * public collections, follower/following counts (data layer + RLS both enforce
 * this). Unknown username → 404. Distinct from /curators, the directory (§8.4).
 */
type PageProps = {
  params: Promise<{ locale: Locale; username: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, username } = await params
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return buildMetadata({
      locale,
      title: `@${username} · ${meta('siteName')}`,
      description: meta('defaultDescription'),
      siteName: meta('siteName'),
      path: `/profile/${username}`,
      noindex: true,
    })
  }

  return buildMetadata({
    locale,
    title: `${profile.displayName} (@${profile.username}) · ${meta('siteName')}`,
    description: profile.bio ?? meta('defaultDescription'),
    siteName: meta('siteName'),
    path: `/profile/${profile.username}`,
  })
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale, username } = await params
  setRequestLocale(locale)

  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const t = await getTranslations({ locale, namespace: 'Profile' })
  const tPlan = await getTranslations({ locale, namespace: 'PlanBadge' })
  const [stats, collections, plan] = await Promise.all([
    getProfileStats(profile.id),
    getPublicCollectionsByOwner(profile.id),
    getUserPlan(profile.id),
  ])

  const joinedLabel = new Date(profile.createdAt).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { month: 'long', year: 'numeric' },
  )

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-6xl px-lg py-2xl lg:px-2xl">
        <section className="flex flex-col gap-xl border-b border-border pb-2xl">
          <ProfileIdentity
            displayName={profile.displayName}
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            bio={profile.bio}
            location={profile.location}
            websiteUrl={profile.websiteUrl}
            joinedLabel={joinedLabel}
            planBadge={plan.badge}
            planBadgeLabel={plan.badge === 'pro' ? tPlan('pro') : tPlan('founding')}
          />
          <StatList
            layout="inline"
            stats={[
              { label: t('collections'), value: stats.collections },
              { label: t('followers'), value: stats.followers },
              { label: t('following'), value: stats.following },
            ]}
          />
        </section>

        <section className="flex flex-col gap-lg pt-2xl">
          <h2 className="font-serif text-h2 text-foreground">
            {t('publicCollections')}
          </h2>
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
      </div>
    </PublicShell>
  )
}
