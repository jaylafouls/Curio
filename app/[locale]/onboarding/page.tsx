import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { PlaceholderPage } from '@/lib/seo/placeholder-page'
import type { Locale } from '@/lib/i18n/routing'

/**
 * /[locale]/onboarding — the funnel steps 03-07 (Interests / Curators /
 * Universe / Ready). Scaffold only; built in the Onboarding chantier (5/7).
 *
 * The auth callback (§3) sends here any user whose onboarding_completed = false.
 * Protected route: middleware redirects unauthenticated visitors to Welcome.
 * The user's provisional username (user_<hex>) will be replaced by a real
 * handle in this flow.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `Onboarding · ${t('siteName')}`,
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: '/onboarding',
  })
}

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <PlaceholderPage label="Onboarding">
      <p className="font-sans text-body text-text-dark/70">
        Personalise your experience — scaffolded (chantier 5/7). Reached after
        sign-up when onboarding is not yet complete.
      </p>
    </PlaceholderPage>
  )
}
