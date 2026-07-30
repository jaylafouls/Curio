'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { createProject, updateProject } from '@/lib/projects/actions'
import {
  PROJECT_COLORS,
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'

/**
 * ProjectModal — deliberately MINIMAL (ADD_ITEM_FLOW §5): a Project is a private
 * organizational container, so the only editable fields are its name and one of
 * 5 colour pastilles. There is NO public toggle and NO Links surface here — a
 * Project is never public and never holds Links directly.
 *
 * One component covers create + edit: pass `project` to edit an existing one,
 * omit it to create. On success it calls `onSaved(id)` (the caller navigates or
 * refreshes) and closes.
 */
export type ProjectModalProps = {
  open: boolean
  onClose: () => void
  onSaved?: (id: string) => void
  /** Present = edit mode; absent = create mode. */
  project?: { id: string; name: string; color: string | null }
}

export function ProjectModal({
  open,
  onClose,
  onSaved,
  project,
}: ProjectModalProps) {
  const t = useTranslations('ProjectModal')
  const isEdit = Boolean(project)

  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState<ProjectColor>(
    (PROJECT_COLORS as readonly string[]).includes(project?.color ?? '')
      ? (project!.color as ProjectColor)
      : 'violet',
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      setError(t('errorName'))
      return
    }
    setError(null)
    startTransition(async () => {
      if (project) {
        const res = await updateProject(project.id, { name: trimmed, color })
        if (!res.ok) {
          setError(t('errorServer'))
          return
        }
        onSaved?.(project.id)
      } else {
        const res = await createProject(trimmed, color)
        if (!res.ok) {
          setError(t('errorServer'))
          return
        }
        onSaved?.(res.id)
      }
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('editTitle') : t('createTitle')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="project-name"
            className="font-sans text-body-small font-medium text-text-dark"
          >
            {t('nameLabel')}
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={100}
            autoFocus
            error={Boolean(error)}
          />
        </div>

        <fieldset className="flex flex-col gap-sm">
          <legend className="mb-xs font-sans text-body-small font-medium text-text-dark">
            {t('colorLabel')}
          </legend>
          <div className="flex flex-wrap gap-md">
            {PROJECT_COLORS.map((c) => {
              const active = c === color
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={active}
                  aria-label={t(`color_${c}`)}
                  className={cn(
                    'relative inline-flex size-9 items-center justify-center rounded-full transition-transform duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
                    active ? 'scale-110 ring-2 ring-violet ring-offset-2' : '',
                  )}
                  style={{ backgroundColor: PROJECT_COLOR_HEX[c] }}
                >
                  {active ? (
                    <Check className="size-4 text-archive" strokeWidth={3} aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="font-sans text-body-small text-badge-food" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-xs flex justify-end gap-sm">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t('saving') : isEdit ? t('save') : t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
