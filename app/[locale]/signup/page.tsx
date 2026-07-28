import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { OrbitalLogo } from '@/components/brand/orbital-logo'
import { SignUpClient } from './signup-client'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Écran 02 — Sign up / Log in (brief §2). Public, forced Cosmic (dark).
 * Server Component owns SEO + layout; the interactive provider/email flow lives
 * in SignUpClient. A valid invitation token arrives via ?token= and is passed
 * through to the client so the callback can redeem it after auth.
 */
type PageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'SignUp' })
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    siteName: (await getTranslations({ locale, namespace: 'Meta' }))('siteName'),
    path: '/signup',
  })
}

export default async function SignUpPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('Welcome')

  return (
    <div className="dark">
      <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-cosmic px-lg text-foreground">
        <div className="pt-3xl">
          <OrbitalLogo label={t('logoAlt')} size={72} />
        </div>
        <SignUpClient locale={locale} token={token} />
      </main>
    </div>
  )
}
