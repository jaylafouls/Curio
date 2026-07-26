import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { ShowcaseClient } from './showcase-client'

/**
 * Components showcase — visual reference for the base UI kit (Phase 1,
 * chantier 2/7). Every component + variant rendered side by side so the coded
 * output can be compared against the mockups, and so later chantiers see what
 * they can consume.
 *
 * generateMetadata is present per the SEO rule, but this internal reference
 * page is marked noindex — it's a dev surface, not public content.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  const base = buildMetadata({
    locale,
    title: `Components · ${t('siteName')}`,
    description: 'Base UI kit reference.',
    siteName: t('siteName'),
    path: '/components-showcase',
  })
  return { ...base, robots: { index: false, follow: false } }
}

export default async function ComponentsShowcasePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-lg px-lg py-4xl">
      <header className="flex flex-col gap-sm">
        <p className="font-sans text-eyebrow uppercase text-olive">
          Phase 1 · Design system
        </p>
        <h1 className="font-serif text-h1 text-foreground">
          Components showcase
        </h1>
        <p className="max-w-2xl font-sans text-body text-foreground/70">
          Base UI kit — every component and variant, for visual comparison
          against the mockups. Presentational only; mock props.
        </p>
      </header>
      <ShowcaseClient />
    </main>
  )
}
