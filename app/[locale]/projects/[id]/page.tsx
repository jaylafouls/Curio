import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { AppShell } from '@/components/app/app-shell'
import { getCurrentUser } from '@/lib/app/data'
import {
  getOwnerProjectById,
  getAttachableCollections,
} from '@/lib/projects/data'
import { ProjectDetailClient } from '@/components/app/project-detail-client'

/**
 * /[locale]/projects/[id] — a single project, owner-only (ADD_ITEM_FLOW §5).
 *
 * Projects are ALWAYS private: this is a protected route (middleware redirects
 * logged-out visitors) and every read is owner-scoped, so a project only ever
 * resolves for its owner — otherwise 404. Always noindex; a private page must
 * never be crawled. No ISR: this is a per-user authenticated page.
 */
type PageProps = { params: Promise<{ locale: Locale; id: string }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ProjectDetail' })
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

export default async function ProjectDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  // Middleware guards this route; bounce to Welcome if the session lapsed.
  if (!user) redirect(`/${locale}`)

  const [project, attachable] = await Promise.all([
    getOwnerProjectById(id),
    getAttachableCollections(id),
  ])

  // Not the owner (or no such project) → 404, never leak existence.
  if (!project) notFound()

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }}
      locale={locale}
    >
      <ProjectDetailClient
        project={project}
        userId={user.id}
        locale={locale}
        attachable={attachable}
      />
    </AppShell>
  )
}
