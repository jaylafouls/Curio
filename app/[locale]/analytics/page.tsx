import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { PageContainer } from '@/components/ui'
import { AppShell } from '@/components/app/app-shell'
import { AnalyticsDashboard } from '@/components/app/analytics-dashboard'
import { getCurrentUser, getCuratorAnalytics } from '@/lib/app/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/analytics — the curator's basic analytics dashboard (spec §4.1
 * "analytics de base", §4.3, §9.1, chantier curator-analytics). A protected
 * route (middleware redirects logged-out visitors to Welcome; /analytics is in
 * PROTECTED_SEGMENTS and robots' PRIVATE_SEGMENTS).
 *
 * No plan gating: during the beta every plan sees the same analytics (decision
 * already taken). Pure read — aggregates the canonical saves_count on the links
 * the user has saved; clicks are surfaced as "not tracked yet" (no click-event
 * source), forks are omitted (no fork mechanism). No fake seeding.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Analytics' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/analytics',
    noindex: true,
  })
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route, but if the session lapsed mid-request, bounce
  // to Welcome rather than render a broken shell.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Analytics' })
  const analytics = await getCuratorAnalytics(user.id)

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
      <PageContainer size="4xl" className="flex flex-col gap-xl">
        <header className="flex flex-col gap-sm">
          <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
          <p className="max-w-2xl font-sans text-body text-foreground/70">
            {t('subtitle')}
          </p>
        </header>

        <AnalyticsDashboard
          analytics={analytics}
          labels={{
            totalSaves: t('totalSaves'),
            totalSavesHint: t('totalSavesHint'),
            clicks: t('clicks'),
            clicksUntracked: t('clicksUntracked'),
            topLinks: t('topLinks'),
            topLinksSaves: t('topLinksSaves'),
            emptyTag: t('emptyTag'),
            emptyTitle: t('emptyTitle'),
            emptyBody: t('emptyBody'),
          }}
        />
      </PageContainer>
    </AppShell>
  )
}
