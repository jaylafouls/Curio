'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from '@/lib/i18n/navigation'
import { ProjectModal } from './project-modal'

/**
 * NewProjectButton — the create entry point for a Project, used in the /projects
 * index header and empty state. Opens the shared ProjectModal (create mode) and,
 * on success, navigates straight to the new project's detail page so the user can
 * start adding collections. `variant` lets the empty-state use the primary style
 * while the header uses a compact secondary button.
 */
export function NewProjectButton({
  userId,
  variant = 'secondary',
}: {
  /** The signed-in user's id — the Storage path prefix for cover uploads. */
  userId: string
  variant?: 'primary' | 'secondary'
}) {
  const t = useTranslations('ProjectDetail')
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size="small"
        onClick={() => setOpen(true)}
        iconLeft={<Plus className="size-4" aria-hidden />}
      >
        {t('createProject')}
      </Button>
      <ProjectModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        onSaved={(id) => {
          setOpen(false)
          router.push(`/projects/${id}`)
        }}
      />
    </>
  )
}
