import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { OrbitalLogo } from '@/components/brand/orbital-logo'
import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import {
  getActiveCoreTopics,
  getCuratorSuggestions,
  getSelectedTopicIds,
} from '@/lib/onboarding/data'
import { buildUserProperties } from '@/lib/analytics/user-properties'
import { AnalyticsIdentify } from '@/components/consent/analytics-identify'
import { OnboardingWizard } from './onboarding-wizard'

/**
 * /[locale]/onboarding — the funnel steps 03-07 (Interests / Curators /
 * Universe / Ready / All set), UX §1.
 *
 * Server Component: middleware already guards the route (unauthenticated →
 * Welcome), but we re-derive the user here to fetch their server-side data and
 * to send an already-onboarded user straight to Home rather than replay the
 * funnel. The interactive multi-step flow lives in OnboardingWizard.
 *
 * Forced Cosmic (dark), matching Welcome/Sign up and the funnel mockups.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Onboarding' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/onboarding',
  })
}

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware guarantees a session on this protected route; this is the RSC
  // safety net (and gives us the user id for the fetchers). Bounce to Welcome
  // if somehow unauthenticated.
  if (!user) {
    redirect({ href: '/', locale })
  }
  const userId = user!.id

  // Already through the funnel → skip straight to Home instead of replaying it.
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.onboarding_completed) {
    redirect({ href: '/home', locale })
  }

  // Server-side funnel data. getCuratorSuggestions returns [] in prod today
  // (no Founding Curators recruited yet); the wizard renders its empty state.
  const selectedTopicIds = await getSelectedTopicIds(userId)
  const [topics, curators] = await Promise.all([
    getActiveCoreTopics(locale),
    getCuratorSuggestions(userId, selectedTopicIds),
  ])

  const t = await getTranslations({ locale, namespace: 'Onboarding' })

  // PostHog person properties (spec §15.3). Assembled server-side; the client
  // component sends them once analytics consent is granted (no-op before then).
  const identity = await buildUserProperties(locale)

  return (
    <div className="dark">
      <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-cosmic px-lg text-foreground">
        <div className="pt-2xl">
          <OrbitalLogo label={t('logoAlt')} size={56} />
        </div>
        <OnboardingWizard
          locale={locale}
          topics={topics}
          curators={curators}
          initialSelectedTopicIds={selectedTopicIds}
        />
        {identity ? (
          <AnalyticsIdentify
            distinctId={identity.distinctId}
            props={identity.props}
          />
        ) : null}
      </main>
    </div>
  )
}
