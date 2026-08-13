import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PageContainer } from '@/components/ui'
import { AppShell } from '@/components/app/app-shell'
import { SavedLinksClient } from '@/components/app/saved-links-client'
import { getCurrentUser, getSavedLinks } from '@/lib/app/data'

/**
 * /[locale]/saved — the signed-in user's saved links (spec §8.9): every
 * user_link, newest first, with an All / Unsorted filter. A protected route
 * (middleware redirects logged-out visitors to Welcome). Read-only this
 * chantier; the save flow that populates it lands in chantier 11. Empty states
 * cover a fresh account — no fake seeding.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Saved' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/saved',
    noindex: true,
  })
}

export default async function SavedPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route; bounce to Welcome if the session lapsed.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Saved' })
  const links = await getSavedLinks(user.id)

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
      <PageContainer size="4xl">
        <header className="mb-2xl flex flex-col gap-2xs">
          <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
          <p className="font-sans text-body-small text-foreground/60">
            {t('subtitle')}
          </p>
        </header>

        <SavedLinksClient links={links} />
      </PageContainer>
    </AppShell>
  )
}
