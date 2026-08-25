import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { PageContainer } from '@/components/ui'
import { AppShell } from '@/components/app/app-shell'
import { NotificationsClient } from '@/components/app/notifications-client'
import { getCurrentUser } from '@/lib/app/data'
import { getNotifications } from '@/lib/notifications/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/notifications — the recipient's social activity feed (spec §8.13,
 * chantier notifications). A protected route (middleware redirects logged-out
 * visitors to Welcome; /notifications is in PROTECTED_SEGMENTS and robots'
 * PRIVATE_SEGMENTS).
 *
 * Feed content is real follow notifications only — the sole social action that
 * emits today (user follow → notify followed; collection follow → notify the
 * collection owner). The tab strip is All · Follows; the placeholder
 * Comments/Likes/Mentions tabs were removed (recette P2-7) rather than shipped
 * as dead "Coming soon" affordances, so no fake rows are ever shown. A fresh
 * account reads [] and the client renders its designed empty state.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Notifications' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/notifications',
    noindex: true,
  })
}

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route, but if the session lapsed mid-request, bounce
  // to Welcome rather than render a broken shell.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Notifications' })
  const notifications = await getNotifications(user.id)

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
      <PageContainer size="3xl" className="flex flex-col gap-xl">
        <header className="flex flex-col gap-sm">
          <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
          <p className="max-w-2xl font-sans text-body text-foreground/70">
            {t('subtitle')}
          </p>
        </header>

        <NotificationsClient notifications={notifications} />
      </PageContainer>
    </AppShell>
  )
}
