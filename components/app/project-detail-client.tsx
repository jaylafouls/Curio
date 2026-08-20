'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, X } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { Button, Badge } from '@/components/ui'
import { CollectionCard } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { cn } from '@/lib/ui/cn'
import { ProjectModal } from './project-modal'
import { AddCollectionToProject } from './add-collection-to-project'
import {
  deleteProject,
  detachCollectionFromProject,
} from '@/lib/projects/actions'
import {
  PROJECT_COLORS,
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'
import type { ProjectDetail, AttachableCollection } from '@/lib/projects/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * ProjectDetailClient — the interactive owner view of /projects/[id]. The server
 * page has already resolved ownership (the route only renders for the owner), so
 * everything here is owner-scoped by construction: edit name/colour, add a new or
 * existing collection, detach a collection, delete the project.
 *
 * A Project is always private and never holds Links directly (ADD_ITEM_FLOW §5),
 * so there is no public toggle and no link surface — only its collections.
 * Mutations refresh via the router so the server re-reads fresh data.
 */
export function ProjectDetailClient({
  project,
  userId,
  locale,
  attachable,
}: {
  project: ProjectDetail
  userId: string
  locale: Locale
  attachable: AttachableCollection[]
}) {
  const t = useTranslations('ProjectDetail')
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // A project's colour is stored as one of the 5 palette keys; map it to hex.
  // Fall back to the raw value (older/free-text) or nothing.
  const isPaletteColor = (v: string | null): v is ProjectColor =>
    v != null && (PROJECT_COLORS as readonly string[]).includes(v)
  const dotColor =
    (isPaletteColor(project.color)
      ? PROJECT_COLOR_HEX[project.color]
      : project.color) ?? undefined

  function refresh() {
    router.refresh()
  }

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return
    startTransition(async () => {
      const res = await deleteProject(project.id)
      if (res.ok) router.push('/projects')
    })
  }

  function handleDetach(collectionId: string) {
    startTransition(async () => {
      const res = await detachCollectionFromProject(collectionId)
      if (res.ok) refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-lg py-2xl lg:px-2xl">
      <Link
        href="/projects"
        className="mb-lg inline-flex items-center font-sans text-body-small text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        ← {t('back')}
      </Link>

      <header className="mb-2xl flex flex-wrap items-start justify-between gap-md">
        <div className="flex items-start gap-md">
          <span
            className="mt-1.5 size-4 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
            aria-hidden
          />
          <div className="flex flex-col gap-2xs">
            <h1 className="font-serif text-h1 text-foreground">{project.name}</h1>
            <p className="font-sans text-body-small text-foreground/60">
              {t('collectionsCount', { count: project.collections.length })}
              {' · '}
              {t('linksCount', { count: project.totalLinks })}
            </p>
            {project.description ? (
              <p className="mt-xs max-w-2xl font-sans text-body-small text-foreground/70">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-sm">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setEditOpen(true)}
            iconLeft={<Pencil className="size-4" aria-hidden />}
          >
            {t('edit')}
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleDelete}
            disabled={pending}
            iconLeft={<Trash2 className="size-4" aria-hidden />}
          >
            {t('delete')}
          </Button>
        </div>
      </header>

      <div className="mb-xl">
        <AddCollectionToProject
          projectId={project.id}
          userId={userId}
          locale={locale}
          attachable={attachable}
          onChanged={refresh}
        />
      </div>

      {project.collections.length > 0 ? (
        <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {project.collections.map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/collections/${c.slug}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <CollectionCard
                  title={c.title}
                  topic={c.topic}
                  cover={c.cover ?? undefined}
                  mosaic={c.mosaic}
                  owner={{
                    name: c.owner.name,
                    avatar: c.owner.avatar ?? undefined,
                  }}
                  linksCount={c.linksCount}
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDetach(c.id)}
                disabled={pending}
                aria-label={t('detach')}
                title={t('detach')}
                className={cn(
                  'absolute right-2 top-2 hidden rounded-full bg-background/90 p-1.5 text-foreground/60 shadow-sm dark:shadow-glow-violet transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet group-hover:block',
                  'disabled:opacity-50',
                )}
              >
                <X className="size-4" aria-hidden />
              </button>
              {!c.isPublic ? (
                <span className="pointer-events-none absolute left-2 top-2">
                  <Badge topic={c.topic}>{t('private')}</Badge>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          tag={t('emptyTitle')}
          title={t('emptyTitle')}
          body={t('emptyBody')}
        />
      )}

      <ProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          refresh()
        }}
        project={{ id: project.id, name: project.name, color: project.color }}
      />
    </div>
  )
}
