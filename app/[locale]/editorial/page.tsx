import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import { AccentText } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'
import { EmptyState } from '@/components/public/empty-state'
import { getPublishedEditorial } from '@/lib/public/editorial'

/**
 * /[locale]/editorial — Curio's editorial hub (spec §8.5). V1 is a curated set
 * of 3-5 static pieces. That content does not exist yet (a rédactionnel task,
 * out of dev scope — flagged), so the page ships the LIST TEMPLATE plus a
 * visible empty state and STAYS in the nav (decided: placeholder visible, page
 * not hidden). Published pieces surface automatically once they exist.
 *
 * generateMetadata per brief rule 1.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Editorial' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/editorial',
  })
}

export default async function EditorialPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Editorial' })
  const pieces = await getPublishedEditorial(locale)

  // Built once, handed to PublicConnectedShell twice: wrapped in <PublicShell>
  // for the server-rendered anon frame, and bare for the connected AppShellFrame
  // path. The wrapper picks one at runtime by session (same idiom as /explore).
  const content = (
    <section className="mx-auto w-full max-w-6xl px-lg py-2xl">
      <header className="mb-xl flex flex-col gap-sm">
        <AccentText
          before={t('titleBefore')}
          accent={t('titleAccent')}
          size="h1"
          as="h1"
        />
        <p className="max-w-xl font-sans text-body text-foreground/70">
          {t('subtitle')}
        </p>
      </header>

      {pieces.length > 0 ? (
        <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((p) => (
            <li key={p.id}>
              <Link
                href={`/editorial/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-foreground/[0.03] transition-shadow duration-base hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-violet-soft/20">
                  {p.cover ? (
                    <Image
                      src={p.cover}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-base group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-sm p-md">
                  <span className="font-sans text-meta font-medium uppercase tracking-wide text-violet">
                    {t(`type.${p.type}`)}
                  </span>
                  <h2 className="font-serif text-h3 leading-tight text-foreground">
                    {p.title}
                  </h2>
                  {p.authorName ? (
                    <span className="font-sans text-meta text-foreground/60">
                      {t('by', { name: p.authorName })}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          tag={t('emptyTag')}
          title={t('emptyTitle')}
          body={t('emptyBody')}
        />
      )}
    </section>
  )

  return (
    <PublicConnectedShell
      locale={locale}
      anon={<PublicShell>{content}</PublicShell>}
    >
      {content}
    </PublicConnectedShell>
  )
}
