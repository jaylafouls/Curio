import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { pingSupabase } from '@/lib/supabase/ping'
import type { Locale } from '@/lib/i18n/routing'

type PageProps = { params: Promise<{ locale: Locale }> }

/**
 * generateMetadata is present on the very first page (brief rule 1). It
 * delegates to the shared buildMetadata helper, so every future page gets
 * canonical + hreflang + OG for free by copying this three-line pattern.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: t('defaultTitle'),
    description: t('defaultDescription'),
    siteName: t('siteName'),
    path: '',
  })
}

// Topic badge tokens — rendered as swatches to verify the palette compiles
// through Tailwind (Design Tokens §1.5). Order matches the tokens doc.
const BADGES = [
  'travel',
  'design',
  'food',
  'books',
  'culture',
  'ideas',
  'style',
  'photography',
  'beauty',
  'wellness',
] as const

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Setup')
  const ping = await pingSupabase()

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-2xl px-lg py-4xl">
      <header className="flex flex-col gap-md">
        <p className="font-sans text-eyebrow uppercase text-olive">
          {t('eyebrow')}
        </p>
        {/* font-serif = Instrument Serif 400; hierarchy by size only (§2.1).
            Accented word in italic violet — the recurring brand pattern §2.3. */}
        <h1 className="font-serif text-display leading-tight text-text-dark">
          {t('titleSuffix')}{' '}
          <em className="italic text-violet">{t('accent')}</em>
        </h1>
        <p className="max-w-2xl font-sans text-body text-text-dark/80">
          {t('body')}
        </p>
      </header>

      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-text-dark">
          {t('tokensHeading')}
        </h2>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-5">
          {BADGES.map((name) => (
            <div key={name} className="flex flex-col gap-xs">
              <span
                className={`h-16 rounded-lg border border-border-light bg-badge-${name}`}
                aria-hidden
              />
              <span className="font-sans text-meta text-text-dark/70">
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Brand accents + a pill CTA to exercise radius.full, violet, shadow */}
        <div className="flex flex-wrap items-center gap-md pt-md">
          <button
            type="button"
            className="rounded-full bg-violet px-lg py-sm font-sans text-body-small text-button-text-on-dark transition-colors duration-base hover:bg-violet-soft hover:text-text-dark"
          >
            Curio CTA
          </button>
          <span className="rounded-full bg-beige px-md py-xs font-sans text-meta text-text-dark">
            beige
          </span>
          <span className="rounded-full bg-olive px-md py-xs font-sans text-meta text-archive">
            olive
          </span>
          <span className="rounded-full bg-brown-light px-md py-xs font-sans text-meta text-text-dark">
            brown-light
          </span>
        </div>
      </section>

      <footer className="mt-auto flex flex-col gap-xs border-t border-border-light pt-lg font-sans text-body-small">
        <p className="text-text-dark/70">
          {t('localeLabel')}: <span className="font-medium">{locale}</span>
        </p>
        <p
          className={
            ping.status === 'ok'
              ? 'text-olive'
              : ping.status === 'error'
                ? 'text-badge-food'
                : 'text-text-dark/50'
          }
        >
          {ping.status === 'ok'
            ? `● ${t('supabaseOk')}`
            : ping.status === 'error'
              ? `● ${ping.message}`
              : `○ ${t('supabaseWaiting')}`}
        </p>
      </footer>
    </main>
  )
}
