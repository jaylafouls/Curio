import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { EmptyState } from '@/components/public/empty-state'
import { Link } from '@/lib/i18n/navigation'
import { NewProjectButton } from '@/components/app/new-project-button'
import { getCurrentUser, getMyProjects } from '@/lib/app/data'
import {
  PROJECT_COLORS,
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'

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
      userId={user.id}
      locale={locale}
    >
      <div className="mx-auto w-full max-w-5xl px-lg py-2xl lg:px-2xl">
        <header className="mb-2xl flex flex-wrap items-end justify-between gap-md">
          <div className="flex flex-col gap-2xs">
            <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
            <p className="font-sans text-body-small text-foreground/60">
              {t('subtitle')}
            </p>
          </div>
          {projects.length > 0 ? <NewProjectButton /> : null}
        </header>

        {projects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const dot = (PROJECT_COLORS as readonly string[]).includes(
                p.color ?? '',
              )
                ? PROJECT_COLOR_HEX[p.color as ProjectColor]
                : (p.color ?? PROJECT_COLOR_HEX.violet)
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex h-full flex-col gap-sm rounded-lg border border-border bg-foreground/[0.02] p-lg transition-colors duration-fast hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: dot }}
                      aria-hidden
                    />
                    <h2 className="font-serif text-h3 text-foreground">
                      {p.name}
                    </h2>
                    {p.description ? (
                      <p className="line-clamp-2 font-sans text-body-small text-foreground/60">
                        {p.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            tag={t('emptyTag')}
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={<NewProjectButton variant="primary" />}
          />
        )}
      </div>
    </AppShell>
  )
}
