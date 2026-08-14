import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo/metadata'
import { ButtonLink, PageContainer } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { AppPageTitle } from '@/components/app/app-header'
import { EmptyState } from '@/components/public/empty-state'
import { getCurrentUser } from '@/lib/app/data'

/**
 * /[locale]/home/personalize — the connected feed-personalisation surface (V1
 * placeholder). Reached from the Home feed's "Personalize" pill.
 *
 * There is no dedicated personalisation UI in V1 yet (Decisions Log §15: the
 * "Personalize" button was left out of scope Phase 3). Recette flagged the old
 * behaviour — the pill jumped to /my-space, an unrelated page — as a bug. This
 * ships an honest connected "coming soon" state instead: it keeps the AppShell
 * chrome (sidebar/top bar), so the user never feels bounced out of the app, and
 * points at the real lever that shapes the feed today (the onboarding Topics,
 * editable from My Universe).
 *
 * Protected + noindex, exactly like the rest of the connected app.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Personalize' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/home/personalize',
    noindex: true,
  })
}

export default async function PersonalizePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route (it lives under the protected `home` segment);
  // bounce to Welcome if the session lapsed mid-request rather than render a
  // broken shell.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Personalize' })

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
      <PageContainer size="4xl">
        <EmptyState
          tag={t('comingSoonTag')}
          title={t('comingSoonTitle')}
          body={t('comingSoonBody')}
          action={
            <ButtonLink
              href="/my-space"
              iconRight={<ArrowRight className="size-4" />}
            >
              {t('editTopicsCta')}
            </ButtonLink>
          }
        />
      </PageContainer>
    </AppShell>
  )
}
