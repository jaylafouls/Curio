import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { checkInvitationToken } from '@/lib/auth/invitation'
import { OrbitalLogo } from '@/components/brand/orbital-logo'
import { AccentText } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'

type PageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ token?: string }>
}

/**
 * Écran 01 — Welcome (brief §1). Public landing, forced Cosmic (dark).
 * generateMetadata present per brief rule 1.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Welcome' })
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    siteName: (await getTranslations({ locale, namespace: 'Meta' }))('siteName'),
    path: '',
  })
}

export default async function WelcomePage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('Welcome')

  // Invitation token (brief §4): valid → nothing visually different; a token
  // that is present but invalid/expired → short inline notice, then the normal
  // Découvreur path. Absent → nothing.
  const tokenState = await checkInvitationToken(token)

  // Forward a still-valid token to the signup screen so redemption can happen
  // at submit. An invalid one is dropped (user proceeds as Découvreur).
  const signupHref = tokenState === 'valid' ? `/signup?token=${token}` : '/signup'

  return (
    // Cosmic-fixed wrapper: `.dark` here (not on <html>) forces the Cosmic
    // palette for this public landing regardless of any theme_preference, which
    // only applies once connected (web). The connected app keeps Archive default.
    <div className="dark">
      <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-cosmic px-lg pb-3xl pt-4xl text-foreground">
        {/* Top-anchored to match the mockup rhythm: logo + wordmark high on the
            screen, tagline tight beneath, CTAs pushed to the bottom via mt-auto.
            max-w-sm (384px) keeps the block within the padded content area on
            narrow phone widths so the primary CTA never overflows. */}
        <div className="flex w-full max-w-sm flex-1 flex-col items-center gap-2xl text-center">
          <div className="flex flex-col items-center gap-sm">
            <OrbitalLogo label={t('logoAlt')} size={96} />
            <span className="font-serif text-h3 tracking-tight text-foreground">
              curio
            </span>
          </div>

          <div className="flex flex-col items-center gap-md">
            <AccentText
              before={t('tagBefore')}
              accent={t('tagAccent')}
              size="display"
              as="h1"
              className="text-balance"
            />
            <p className="font-sans text-body text-foreground/70">
              {t('body')}
            </p>

            {tokenState === 'invalid' ? (
              <p
                role="status"
                className="max-w-sm font-sans text-body-small text-foreground/60"
              >
                {t('invalidToken')}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex w-full flex-col items-center gap-md">
            {/* Primary CTA → écran 02. Rendered as a locale-aware Link styled as
                the pill Button (Button is <button>; we need an anchor here). */}
            <Link
              href={signupHref}
              className="inline-flex h-11 w-full items-center justify-center gap-sm rounded-full bg-violet px-lg font-sans text-body-small font-medium text-button-text shadow-glow-violet transition-colors duration-base hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic"
            >
              {t('ctaBuild')}
            </Link>
            {/* Secondary CTA → /explore (Phase 2). Stub route redirects for now. */}
            <Link
              href="/explore"
              className="inline-flex h-11 items-center justify-center rounded-full px-lg font-sans text-body-small text-foreground/80 transition-colors duration-base hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic"
            >
              {t('ctaExplore')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
