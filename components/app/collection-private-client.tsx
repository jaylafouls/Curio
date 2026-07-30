'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { useRouter } from '@/lib/i18n/navigation'
import { CollectionDetailBody } from './collection-detail-body'
import { CollectionModal } from './collection-modal'
import { fetchOwnerCollectionBySlug } from '@/lib/collections/actions'
import type { CollectionDetail } from '@/lib/collections/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * CollectionPrivateClient — the fallback render when the public (anon) read of a
 * collection slug MISSES. That happens for a PRIVATE collection: it isn't in the
 * ISR-cached public HTML (correct — crawlers must never see it), so the owner
 * views it here entirely client-side after hydration.
 *
 * This keeps the server route render cookie-free and cacheable for the public
 * path while never caching private content: if the slug resolves for the caller
 * (they own it) we render the body + an owner edit bar; otherwise it's a genuine
 * 404 (non-owner, logged out, or no such slug). Because it already holds the
 * owner detail, it renders the edit bar itself rather than nesting the public
 * owner overlay (which would re-fetch).
 */
export function CollectionPrivateClient({
  slug,
  locale,
}: {
  slug: string
  locale: Locale
}) {
  const t = useTranslations('CollectionDetail')
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'owned'; detail: CollectionDetail }
    | { status: 'missing' }
  >({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchOwnerCollectionBySlug(slug)
      .then((detail) => {
        if (!active) return
        setState(detail ? { status: 'owned', detail } : { status: 'missing' })
      })
      .catch(() => {
        if (active) setState({ status: 'missing' })
      })
    return () => {
      active = false
    }
  }, [slug])

  if (state.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-4xl px-lg py-3xl lg:px-2xl">
        <div className="h-40 animate-pulse rounded-lg bg-foreground/[0.04]" />
      </div>
    )
  }

  // Not the owner / not signed in / no such slug → in-page not-found panel.
  //
  // We must NOT call notFound() here: this runs AFTER hydration (the owner check
  // is async), and throwing the not-found signal from a client component
  // post-hydration makes React try to swap the whole document tree client-side,
  // which collides with the live DOM (HierarchyRequestError / "Only one element
  // on document allowed"). The route already emits noindex metadata for a miss,
  // so an in-page panel is the correct, crash-free 404 for anon and non-owners —
  // and it never leaks the private collection (nothing is fetched for them).
  if (state.status === 'missing') {
    return (
      <div className="mx-auto w-full max-w-2xl px-lg py-3xl lg:px-2xl">
        <EmptyState
          tag={t('private')}
          title={t('notFoundTitle')}
          body={t('notFoundBody')}
        />
      </div>
    )
  }

  const { detail } = state
  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-lg pt-2xl lg:px-2xl">
        <div className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-violet/30 bg-violet/[0.06] px-lg py-md">
          <div className="flex items-center gap-sm">
            {detail.isPublic ? (
              <Globe className="size-4 text-violet" aria-hidden />
            ) : (
              <Lock className="size-4 text-foreground/50" aria-hidden />
            )}
            <span className="font-sans text-body-small text-foreground">
              {t('manageOwner')}
            </span>
            <span className="font-sans text-meta text-foreground/50">
              · {detail.isPublic ? t('public') : t('private')}
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
        {detail.note ? (
          <div className="mt-lg rounded-lg border border-border-light bg-foreground/[0.02] px-lg py-md">
            <p className="whitespace-pre-line font-sans text-body-small text-foreground/70">
              {detail.note}
            </p>
          </div>
        ) : null}
      </div>

      <CollectionDetailBody
        collection={detail}
        labels={{
          by: t('by', { name: detail.owner.name }),
          linksCount: t('linksCount', { count: detail.linksCount }),
          unsectioned: t('unsectioned'),
          emptyTitle: t('emptyTitle'),
          emptyBody: t('emptyBody'),
        }}
      />

      <CollectionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          router.refresh()
        }}
        locale={locale}
        userId={detail.owner.id}
        collection={{
          id: detail.id,
          name: detail.title,
          topic: detail.topic,
          description: detail.description,
          note: detail.note,
          cover: detail.cover,
          isPublic: detail.isPublic,
        }}
      />
    </>
  )
}
