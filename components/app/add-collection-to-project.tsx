'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FolderPlus, Plus, Check } from 'lucide-react'
import { Modal, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { CollectionModal } from './collection-modal'
import { attachCollectionToProject } from '@/lib/projects/actions'
import type { AttachableCollection } from '@/lib/projects/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * AddCollectionToProject — the "Add a collection to this project" flow
 * (ADD_ITEM_FLOW §5.2). Two paths from one entry point:
 *   • Create new  → opens the shared CollectionModal with projectId prefilled.
 *   • Attach existing → picks one of the owner's other collections and sets its
 *     project_id (moving it out of any prior project).
 *
 * `attachable` is the owner's collections not already in this project, fetched
 * server-side and passed in. After a mutation the caller refreshes via router.
 */
export function AddCollectionToProject({
  projectId,
  userId,
  locale,
  attachable,
  onChanged,
}: {
  projectId: string
  userId: string
  locale: Locale
  attachable: AttachableCollection[]
  onChanged: () => void
}) {
  const t = useTranslations('ProjectDetail')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function attach(collectionId: string) {
    setError(null)
    startTransition(async () => {
      const res = await attachCollectionToProject(projectId, collectionId)
      if (!res.ok) {
        setError(t('attachError'))
        return
      }
      setPickerOpen(false)
      onChanged()
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-sm">
        <Button
          size="small"
          onClick={() => setCreateOpen(true)}
          iconLeft={<Plus className="size-4" aria-hidden />}
        >
          {t('createCollection')}
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setPickerOpen(true)}
          iconLeft={<FolderPlus className="size-4" aria-hidden />}
        >
          {t('attachExisting')}
        </Button>
      </div>

      <CollectionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false)
          onChanged()
        }}
        locale={locale}
        userId={userId}
        projectId={projectId}
      />

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('attachTitle')}
      >
        {attachable.length === 0 ? (
          <p className="font-sans text-body-small text-text-dark/60">
            {t('attachEmpty')}
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-xs overflow-y-auto">
            {attachable.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => attach(c.id)}
                  disabled={pending}
                  className={cn(
                    'flex w-full items-center justify-between gap-md rounded-md border border-border px-md py-sm text-left transition-colors duration-fast hover:bg-text-dark/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-50',
                  )}
                >
                  <span className="flex items-center gap-sm">
                    <Badge topic={c.topic} />
                    <span className="font-sans text-body-small text-text-dark">
                      {c.title}
                    </span>
                  </span>
                  {c.currentProjectId ? (
                    <span className="font-sans text-meta text-text-dark/40">
                      {t('willMove')}
                    </span>
                  ) : (
                    <Check className="size-4 text-text-dark/30" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="mt-sm font-sans text-body-small text-badge-food" role="alert">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
