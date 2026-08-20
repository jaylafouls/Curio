'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Upload, X } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { createClient } from '@/lib/supabase/client'
import { createProject, updateProject } from '@/lib/projects/actions'
import {
  PROJECT_COLORS,
  PROJECT_COLOR_HEX,
  type ProjectColor,
} from '@/lib/projects/colors'

/**
 * ProjectModal — a Project is a private organizational container (ADD_ITEM_FLOW
 * §5): the editable fields are its name, one of 5 colour pastilles, and an
 * optional custom cover image (point 8 of the My Universe review). There is NO
 * public toggle and NO Links surface — a Project is never public and never holds
 * Links directly.
 *
 * One component covers create + edit: pass `project` to edit an existing one,
 * omit it to create. On success it calls `onSaved(id)` (the caller navigates or
 * refreshes) and closes.
 *
 * Cover upload goes straight to Supabase Storage from the browser (owner-scoped
 * RLS by the <userId>/ path prefix), so no binary passes through a server
 * action — only the resulting public URL is submitted. Mirrors CollectionModal.
 */
export type ProjectModalProps = {
  open: boolean
  onClose: () => void
  onSaved?: (id: string) => void
  /** The signed-in user's id — the Storage path prefix for owner-scoped uploads. */
  userId: string
  /** Present = edit mode; absent = create mode. */
  project?: {
    id: string
    name: string
    color: string | null
    cover: string | null
  }
}

const COVER_BUCKET = 'project-covers'
const MAX_COVER_BYTES = 5 * 1024 * 1024

export function ProjectModal({
  open,
  onClose,
  onSaved,
  userId,
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
  const [coverUrl, setCoverUrl] = useState<string | null>(
    project?.cover ?? null,
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCoverFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError(t('errorImageType'))
      return
    }
    if (file.size > MAX_COVER_BYTES) {
      setError(t('errorImageSize'))
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      // Path MUST start with the user's id (Storage RLS prefix check).
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(COVER_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        console.error('project cover upload failed', { message: upErr.message })
        setError(t('errorUpload'))
        return
      }
      const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path)
      setCoverUrl(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

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
        const res = await updateProject(project.id, {
          name: trimmed,
          color,
          coverUrl,
        })
        if (!res.ok) {
          setError(t('errorServer'))
          return
        }
        onSaved?.(project.id)
      } else {
        const res = await createProject(trimmed, color, coverUrl)
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

        {/* Cover — optional custom image; falls back to the colour pastille. */}
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-body-small font-medium text-text-dark">
            {t('coverLabel')}
          </span>
          <div className="flex items-center gap-md">
            {coverUrl ? (
              // Preview only — a plain img is fine (not a layout/SEO image).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="size-16 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-md bg-text-dark/5 text-text-dark/30">
                <Upload className="size-5" aria-hidden />
              </div>
            )}
            <div className="flex items-center gap-sm">
              <Button
                variant="secondary"
                size="small"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                iconLeft={<Upload className="size-4" aria-hidden />}
              >
                {uploading ? t('uploading') : t('coverUpload')}
              </Button>
              {coverUrl ? (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setCoverUrl(null)}
                  iconLeft={<X className="size-4" aria-hidden />}
                >
                  {t('coverRemove')}
                </Button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleCoverFile(f)
                e.target.value = '' // allow re-selecting the same file
              }}
            />
          </div>
        </div>

        {error ? (
          <p className="font-sans text-body-small text-badge-food" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-xs flex justify-end gap-sm">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={pending || uploading}>
            {pending ? t('saving') : isEdit ? t('save') : t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
