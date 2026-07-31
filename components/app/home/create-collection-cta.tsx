'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from '@/lib/i18n/navigation'
import { CollectionModal } from '@/components/app/collection-modal'
import type { Locale } from '@/lib/i18n/routing'

/**
 * CreateCollectionCta — the Home sidebar's "Create a collection" entry point
 * (spec §8.2). Reuses the shared CollectionModal (chantier 10, create mode) and,
 * on success, navigates to the new collection so the user can start adding links.
 * `variant` lets the block render a full-width primary button in the sidebar.
 */
export function CreateCollectionCta({
  userId,
  locale,
  variant = 'primary',
  className,
}: {
  userId: string
  locale: Locale
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  const t = useTranslations('Home')
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        iconLeft={<Plus className="size-4" aria-hidden />}
        className={className}
      >
        {t('createCollection')}
      </Button>
      <CollectionModal
        open={open}
        onClose={() => setOpen(false)}
        locale={locale}
        userId={userId}
        onSaved={(res) => {
          setOpen(false)
          if (res.slug) router.push(`/collections/${res.slug}`)
        }}
      />
    </>
  )
}
