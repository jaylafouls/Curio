'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FolderInput, Check, Inbox } from 'lucide-react'
import { Modal, Badge, type BadgeTopic } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { moveToCollection } from '@/lib/app/actions'

export type MoveTargetCollection = {
  id: string
  name: string
  topic: BadgeTopic
}

/**
 * MoveToCollectionButton — the per-row "Move to collection" affordance on /saved.
 * Opens a picker of the user's collections; selecting one calls moveToCollection,
 * which MOVES (updates collection_id in place) — the save leaves the Inbox but
 * stays in "All" and now shows in its collection (never copied, never lost).
 *
 * A row already in a collection also gets a "Move to Inbox" (collection_id NULL)
 * option, so filing is reversible. On success the parent is told which row moved
 * where, so it can update its list in place without a full refetch.
 */
export function MoveToCollectionButton({
  userLinkId,
  currentCollectionId,
  collections,
  onMoved,
}: {
  userLinkId: string
  currentCollectionId: string | null
  collections: MoveTargetCollection[]
  onMoved: (collectionId: string | null) => void
}) {
  const t = useTranslations('Saved')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function move(collectionId: string | null) {
    if (collectionId === currentCollectionId) {
      setOpen(false)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await moveToCollection(userLinkId, collectionId)
      if (!res.ok) {
        setError(t('moveError'))
        return
      }
      setOpen(false)
      onMoved(collectionId)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('moveLabel')}
        className="flex size-9 items-center justify-center rounded-md border border-border text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        <FolderInput className="size-4" strokeWidth={2} aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('moveTitle')}>
        {collections.length === 0 ? (
          <p className="font-sans text-body-small text-text-dark/60">
            {t('moveEmpty')}
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-xs overflow-y-auto">
            {/* Move back to the Inbox — only offered when currently filed. */}
            {currentCollectionId !== null ? (
              <li>
                <button
                  type="button"
                  onClick={() => move(null)}
                  disabled={pending}
                  className="flex w-full items-center gap-sm rounded-md border border-border px-md py-sm text-left transition-colors duration-fast hover:bg-text-dark/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-50"
                >
                  <Inbox className="size-4 text-text-dark/40" aria-hidden />
                  <span className="font-sans text-body-small text-text-dark">
                    {t('moveToInbox')}
                  </span>
                </button>
              </li>
            ) : null}

            {collections.map((c) => {
              const isCurrent = c.id === currentCollectionId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => move(c.id)}
                    disabled={pending || isCurrent}
                    aria-current={isCurrent}
                    className={cn(
                      'flex w-full items-center justify-between gap-md rounded-md border border-border px-md py-sm text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-50',
                      isCurrent
                        ? 'bg-text-dark/[0.03]'
                        : 'hover:bg-text-dark/[0.03]',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-sm">
                      <Badge topic={c.topic} />
                      <span className="truncate font-sans text-body-small text-text-dark">
                        {c.name}
                      </span>
                    </span>
                    {isCurrent ? (
                      <Check
                        className="size-4 shrink-0 text-text-dark/40"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {error ? (
          <p
            className="mt-sm font-sans text-body-small text-badge-food"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
