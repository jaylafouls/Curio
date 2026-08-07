import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { AppShell } from '@/components/app/app-shell'
import { SettingsClient } from '@/components/app/settings/settings-client'
import {
  getSettingsProfile,
  getConnectedIdentities,
} from '@/lib/settings/data'
import { getThemePreference } from '@/lib/theme/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/settings — account settings (spec §8.14, chantier 13). A protected
 * route (middleware redirects logged-out visitors to Welcome; /settings is in
 * PROTECTED_SEGMENTS). Closes the chantier 9 "edit profile deferred" loop and
 * the Privacy-Policy "preference-center link" loop.
 *
 * noindex: a private authenticated account page must never be crawled or indexed
 * (robots.ts already reserves /settings).
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Settings' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/settings',
    noindex: true,
  })
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const [profile, identities, themePreference] = await Promise.all([
    getSettingsProfile(),
    getConnectedIdentities(),
    getThemePreference(),
  ])

  // Middleware guards this route, but if the session lapsed mid-request, bounce
  // to Welcome rather than render a broken shell.
  if (!profile) redirect(`/${locale}`)

  return (
    <AppShell
      user={{
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      }}
      userId={profile.id}
      locale={locale}
    >
      <SettingsClient
        profile={profile}
        identities={identities}
        locale={locale}
        themePreference={themePreference}
      />
    </AppShell>
  )
}
