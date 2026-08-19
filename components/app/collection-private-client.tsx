'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { useRouter } from '@/lib/i18n/navigation'
import { CollectionDetailBody } from './collection-detail-body'
import { CollectionBreadcrumb } from './collection-breadcrumb'
import { CollectionModal } from './collection-modal'
import { CollectionConnectedShell } from './collection-connected-shell'
import { fetchPrivateCollectionView } from '@/lib/collections/actions'
import type { ConnectedShellData } from '@/lib/app/actions'
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
  // The connected-shell bundle, resolved in the SAME round-trip as the owner
  // detail (fetchPrivateCollectionView) and handed to the shell so it does not
  // fire a second session request — body and app frame appear together.
  const [shell, setShell] = useState<ConnectedShellData | null>(null)
  const [shellResolved, setShellResolved] = useState(false)

  useEffect(() => {
    let active = true
    fetchPrivateCollectionView(slug)
      .then(({ detail, shell: shellData }) => {
        if (!active) return
        setShell(shellData)
        setShellResolved(true)
        setState(detail ? { status: 'owned', detail } : { status: 'missing' })
      })
      .catch(() => {
        if (!active) return
        setShellResolved(true)
        setState({ status: 'missing' })
      })
    return () => {
      active = false
    }
  }, [slug])

  // Each of the three states computes its inner content into `body`; the single
  // wrapper below applies the session-gated connected shell ONCE. A signed-in
  // owner (or a signed-in non-owner hitting the not-found panel) keeps the app
  // frame here, exactly as on every connected page; an anonymous visitor gets the
  // bare content (the shell renders nothing without a session). Computing the body
  // first and wrapping once means the shell's session check runs a single time
  // regardless of which state is showing.
  let body: ReactNode

  if (state.status === 'loading') {
    body = (
      <div className="mx-auto w-full max-w-4xl px-lg py-3xl lg:px-2xl">
        <div className="h-40 animate-pulse rounded-lg bg-foreground/[0.04]" />
      </div>
    )
  } else if (state.status === 'missing') {
    // Not the owner / not signed in / no such slug → in-page not-found panel.
    //
    // We must NOT call notFound() here: this runs AFTER hydration (the owner
    // check is async), and throwing the not-found signal from a client component
    // post-hydration makes React try to swap the whole document tree client-side,
    // which collides with the live DOM (HierarchyRequestError / "Only one element
    // on document allowed"). The route already emits noindex metadata for a miss,
    // so an in-page panel is the correct, crash-free 404 for anon and non-owners
    // — and it never leaks the private collection (nothing is fetched for them).
    body = (
      <div className="mx-auto w-full max-w-2xl px-lg py-3xl lg:px-2xl">
        <EmptyState
          tag={t('private')}
          title={t('notFoundTitle')}
          body={t('notFoundBody')}
        />
      </div>
    )
  } else {
    const { detail } = state
    body = (
      <>
        <div className="mx-auto w-full max-w-4xl px-lg pt-2xl lg:px-2xl">
        <CollectionBreadcrumb title={detail.title} className="mb-md" />
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
          <div className="mt-lg rounded-lg border border-border bg-foreground/[0.02] px-lg py-md">
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

  return (
    <CollectionConnectedShell
      locale={locale}
      shell={shell}
      resolved={shellResolved}
    >
      {body}
    </CollectionConnectedShell>
  )
}
