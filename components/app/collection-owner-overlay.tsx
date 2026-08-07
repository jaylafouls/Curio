'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from '@/lib/i18n/navigation'
import { CollectionModal } from './collection-modal'
import { fetchOwnerCollection } from '@/lib/collections/actions'
import type { CollectionDetail } from '@/lib/collections/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * CollectionOwnerOverlay — the per-user owner controls layered OVER the public
 * ISR collection page (brief: "garde le chemin anon/SEO/ISR existant pour les
 * crawlers, ajoute la vue propriétaire par-dessus").
 *
 * The public page is cached and identical for everyone, so ownership MUST NOT be
 * decided during that render or the cached HTML would leak one user's edit
 * controls to all. Instead this client component fetches the owner-scoped detail
 * AFTER hydration via a Server Action: null → not the owner → render nothing;
 * otherwise show an edit bar + the private note. On save it refreshes the route
 * so the public body (and this overlay) re-read fresh data.
 *
 * `collectionId` is the public collection's real id (the page resolved it by slug
 * and passes the id down) — the overlay never needs to re-resolve the slug.
 *
 * No userId prop: the Server Action re-derives the caller securely and returns
 * null for anyone who isn't the owner (including logged-out visitors), so the
 * page stays fully static (no cookie read at render time).
 */
export function CollectionOwnerOverlay({
  collectionId,
  locale,
}: {
  collectionId: string
  locale: Locale
}) {
  const t = useTranslations('CollectionDetail')
  const router = useRouter()
  const [owned, setOwned] = useState<CollectionDetail | null>(null)
  const [checked, setChecked] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchOwnerCollection(collectionId)
      .then((detail) => {
        if (active) setOwned(detail)
      })
      .catch(() => {
        // Best-effort: a failed owner check just means no overlay.
      })
      .finally(() => {
        if (active) setChecked(true)
      })
    return () => {
      active = false
    }
  }, [collectionId])

  // Not the owner (or still checking / logged out) → the public page stands alone.
  if (!checked || !owned) return null

  return (
    <div className="mx-auto w-full max-w-4xl px-lg lg:px-2xl">
      <div className="mb-lg flex flex-wrap items-center justify-between gap-md rounded-lg border border-violet/30 bg-violet/[0.06] px-lg py-md">
        <div className="flex items-center gap-sm">
          {owned.isPublic ? (
            <Globe className="size-4 text-violet" aria-hidden />
          ) : (
            <Lock className="size-4 text-foreground/50" aria-hidden />
          )}
          <span className="font-sans text-body-small text-foreground">
            {t('manageOwner')}
          </span>
          <span className="font-sans text-meta text-foreground/50">
            · {owned.isPublic ? t('public') : t('private')}
          </span>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setEditOpen(true)}
          iconLeft={<Pencil className="size-4" aria-hidden />}
        >
          {t('edit')}
        </Button>
      </div>

      {owned.note ? (
        <div className="mb-lg rounded-lg border border-border bg-foreground/[0.02] px-lg py-md">
          <p className="whitespace-pre-line font-sans text-body-small text-foreground/70">
            {owned.note}
          </p>
        </div>
      ) : null}

      <CollectionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          router.refresh()
        }}
        locale={locale}
        userId={owned.owner.id}
        collection={{
          id: owned.id,
          name: owned.title,
          topic: owned.topic,
          description: owned.description,
          note: owned.note,
          cover: owned.cover,
          isPublic: owned.isPublic,
        }}
      />
    </div>
  )
}
