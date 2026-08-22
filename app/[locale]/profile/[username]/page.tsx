import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PageContainer } from '@/components/ui'
import { PublicShell } from '@/components/public/public-shell'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { ProfileIdentity } from '@/components/app/profile-identity'
import { CuratorFollowButton } from '@/components/app/curator-follow-button'
import { CollectionGrid } from '@/components/app/collection-grid'
import { StatList } from '@/components/app/stat-list'
import { EmptyState } from '@/components/public/empty-state'
import {
  getPublicProfileByUsername,
  getPublicProfileStats,
  getPublicProfileCollections,
} from '@/lib/public/data'
import { resolvePlanBadge } from '@/lib/plans/data'

// ISR for this high-traffic public page (chantier SEO part 6). Revalidates on
// this window rather than rendering per request. Next requires a static literal;
// mirrors PUBLIC_PAGE_REVALIDATE (lib/seo/config.ts).
export const revalidate = 3600

/**
 * /[locale]/profile/[username] — a curator's PUBLIC profile (spec §8.10). Stays
 * public (no noindex): logged-out visitors and crawlers read it, so the anon
 * render is the marketing PublicShell. Only public data is surfaced — public
 * collections, follower/following counts (data layer + RLS both enforce this).
 * Unknown username → 404. Distinct from /curators, the directory (§8.4).
 *
 * A signed-in visitor gets the connected app chrome instead, via
 * PublicConnectedShell — the same session-gated swap already on /explore,
 * /curators and /collections/[id]. It is entirely client-side and post-hydration,
 * so the cookie-free ISR/anon render stays byte-identical (SEO + cache intact).
 */
type PageProps = {
  params: Promise<{ locale: Locale; username: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, username } = await params
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  const profile = await getPublicProfileByUsername(username)

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

  const profile = await getPublicProfileByUsername(username)
  if (!profile) notFound()

  const t = await getTranslations({ locale, namespace: 'Profile' })
  const tPlan = await getTranslations({ locale, namespace: 'PlanBadge' })
  const [stats, collections] = await Promise.all([
    getPublicProfileStats(profile.id),
    getPublicProfileCollections(profile.id),
  ])

  // Badge is derived from the world-readable founding flag only. The Pro badge is
  // gated behind the plans table, which is owner-only under RLS (plans_select_self)
  // — a visited public profile can never expose another user's plan regardless of
  // client, so reading plans here would only re-introduce a cookie() call (turning
  // this ISR page dynamic per session) with no reachable Pro outcome. Pro is also
  // unassigned during the beta. Founding wins anyway per resolvePlanBadge (§15).
  const badge = resolvePlanBadge(profile.isFoundingCurator, 'free')

  const joinedLabel = new Date(profile.createdAt).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { month: 'long', year: 'numeric' },
  )

  // Built once, handed to PublicConnectedShell twice: wrapped in <PublicShell>
  // for the server-rendered anon frame, and bare for the connected AppShellFrame
  // path. The wrapper picks one at runtime by session (same idiom as /explore).
  const content = (
    <PageContainer size="6xl">
      <section className="flex flex-col gap-xl border-b border-border pb-2xl">
        <ProfileIdentity
          displayName={profile.displayName}
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          location={profile.location}
          websiteUrl={profile.websiteUrl}
          joinedLabel={joinedLabel}
          planBadge={badge}
          planBadgeLabel={badge === 'pro' ? tPlan('pro') : tPlan('founding')}
          actions={<CuratorFollowButton curatorId={profile.id} />}
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
    </PageContainer>
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
