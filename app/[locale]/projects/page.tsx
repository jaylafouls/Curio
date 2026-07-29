import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { EmptyState } from '@/components/public/empty-state'
import { getCurrentUser, getMyProjects } from '@/lib/app/data'

/**
 * /[locale]/projects — the signed-in user's private projects index (spec §8.8).
 * Projects are always private, so this is a protected route (middleware
 * redirects logged-out visitors) and never anon-visible. Read-only this
 * chantier: it lists what exists; creation, edit and the /projects/[id] detail
 * page land in chantier 10. Empty state covers a fresh account — no fake seeding.
 *
 * noindex: a private authenticated page must never be crawled or indexed.
 */
type PageProps = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Projects' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: `${t('metaTitle')} · ${meta('siteName')}`,
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '/projects',
    noindex: true,
  })
}

export default async function ProjectsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route; bounce to Welcome if the session lapsed.
  if (!user) redirect(`/${locale}`)

  const t = await getTranslations({ locale, namespace: 'Projects' })
  const projects = await getMyProjects(user.id)

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }}
      locale={locale}
    >
      <div className="mx-auto w-full max-w-5xl px-lg py-2xl lg:px-2xl">
        <header className="mb-2xl flex flex-col gap-2xs">
          <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
          <p className="font-sans text-body-small text-foreground/60">
            {t('subtitle')}
          </p>
        </header>

        {projects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-sm rounded-lg border border-border-light bg-foreground/[0.02] p-lg"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: p.color ?? 'var(--violet-soft)' }}
                  aria-hidden
                />
                <h2 className="font-serif text-h3 text-foreground">{p.name}</h2>
                {p.description ? (
                  <p className="line-clamp-2 font-sans text-body-small text-foreground/60">
                    {p.description}
                  </p>
                ) : null}
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
      </div>
    </AppShell>
  )
}
