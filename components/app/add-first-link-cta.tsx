'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui'

/**
 * AddFirstLinkCta — the owner-only call to action on an EMPTY collection
 * (recette P3 #3). A freshly created collection lands on its detail page with
 * no links; instead of a bare "nothing here yet" panel, the owner gets a clear
 * next step that opens the Save Flow wizard.
 *
 * It dispatches the `curio:save-flow` window event that SaveFlowProvider (mounted
 * once by AppShellFrame on every connected page) listens for — so this small
 * client button can trigger the wizard without the server-rendered
 * CollectionDetailBody having to thread a handler down. Rendered only for the
 * owner (the caller passes it into CollectionDetailBody's ownerCta slot), never
 * in the public/anon HTML.
 */
export function AddFirstLinkCta() {
  const t = useTranslations('CollectionDetail')

  return (
    <Button
      variant="primary"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('curio:save-flow', { detail: { action: 'wizard' } }),
        )
      }
      iconLeft={<Plus className="size-4" aria-hidden />}
    >
      {t('addFirstLink')}
    </Button>
  )
}
