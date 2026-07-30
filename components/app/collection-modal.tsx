'use client'

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useTranslations } from 'next-intl'
import { Check, Plus, Upload, X, Globe, Lock } from 'lucide-react'
import { Modal, Button, Input, Badge } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { createClient } from '@/lib/supabase/client'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { suggestedSections } from '@/lib/collections/sections'
import {
  createCollection,
  updateCollection,
} from '@/lib/collections/actions'
import type { Locale } from '@/lib/i18n/routing'

/**
 * CollectionModal — ONE component for create + edit (chantier 10).
 *
 * Create mode (no `collection`): name, topic (1 collection = 1 topic, fixed
 * after creation per data model §6), description, note, cover upload, and a set
 * of Sections seeded from the topic's suggestions (ADD_ITEM_FLOW §4.6) that the
 * user can toggle off or extend with custom names. New collections are PRIVATE;
 * there is NO public toggle in create mode.
 *
 * Edit mode (`collection` present): name, description, note, cover, AND the
 * is_public toggle (publishing is an explicit edit-only action). Topic is shown
 * read-only (immutable). Section editing on the collection detail page handles
 * add/remove of existing sections; this modal seeds them only at creation.
 *
 * Cover upload goes straight to Supabase Storage from the browser (owner-scoped
 * RLS by the <userId>/ path prefix), so no binary passes through a server
 * action — only the resulting public URL is submitted.
 */
export type EditableCollection = {
  id: string
  name: string
  topic: BadgeTopic
  description: string | null
  note: string | null
  cover: string | null
  isPublic: boolean
}

export type CollectionModalProps = {
  open: boolean
  onClose: () => void
  onSaved?: (result: { id: string; slug?: string }) => void
  locale: Locale
  /** The signed-in user's id — the Storage path prefix for owner-scoped uploads. */
  userId: string
  /** Present = edit mode; absent = create mode. */
  collection?: EditableCollection
  /** Optional project to create the collection inside (create mode). */
  projectId?: string
}

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

const COVER_BUCKET = 'collection-covers'
const MAX_COVER_BYTES = 5 * 1024 * 1024

export function CollectionModal({
  open,
  onClose,
  onSaved,
  locale,
  userId,
  collection,
  projectId,
}: CollectionModalProps) {
  const t = useTranslations('CollectionModal')
  const isEdit = Boolean(collection)

  const [name, setName] = useState(collection?.name ?? '')
  const [topic, setTopic] = useState<BadgeTopic>(collection?.topic ?? 'travel')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [note, setNote] = useState(collection?.note ?? '')
  const [isPublic, setIsPublic] = useState(collection?.isPublic ?? false)
  const [coverUrl, setCoverUrl] = useState<string | null>(
    collection?.cover ?? null,
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Section chips: suggestions for the current topic, all pre-selected, plus any
  // custom names the user adds. Only used in create mode.
  const suggestions = useMemo(
    () => suggestedSections(topic, locale),
    [topic, locale],
  )
  const [customSections, setCustomSections] = useState<string[]>([])
  const [dropped, setDropped] = useState<Set<string>>(new Set())
  const [newSection, setNewSection] = useState('')

  const activeSections = useMemo(() => {
    const fromSuggestions = suggestions.filter((s) => !dropped.has(s))
    return [...fromSuggestions, ...customSections]
  }, [suggestions, dropped, customSections])

  function toggleSuggestion(s: string) {
    setDropped((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  function addCustomSection() {
    const v = newSection.trim()
    if (!v) return
    if (activeSections.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setNewSection('')
      return
    }
    setCustomSections((prev) => [...prev, v])
    setNewSection('')
  }

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
        console.error('cover upload failed', { message: upErr.message })
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
      if (isEdit) {
        const res = await updateCollection({
          id: collection!.id,
          name: trimmed,
          description: description.trim() || null,
          note: note.trim() || null,
          coverUrl,
          isPublic,
        })
        if (!res.ok) {
          setError(t('errorServer'))
          return
        }
        onSaved?.({ id: collection!.id })
        onClose()
      } else {
        const res = await createCollection({
          name: trimmed,
          topicId: topic,
          description: description.trim() || null,
          note: note.trim() || null,
          coverUrl,
          projectId: projectId ?? null,
          sections: activeSections,
        })
        if (!res.ok) {
          setError(t('errorServer'))
          return
        }
        onSaved?.({ id: res.id, slug: res.slug })
        onClose()
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('editTitle') : t('createTitle')}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        {/* Name */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="collection-name"
            className="font-sans text-body-small font-medium text-text-dark"
          >
            {t('nameLabel')}
          </label>
          <Input
            id="collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={100}
            autoFocus
            error={Boolean(error)}
          />
        </div>

        {/* Topic — selectable at create, read-only at edit (immutable). */}
        <fieldset className="flex flex-col gap-sm">
          <legend className="mb-xs font-sans text-body-small font-medium text-text-dark">
            {t('topicLabel')}
          </legend>
          {isEdit ? (
            <div>
              <Badge topic={topic} />
              <p className="mt-xs font-sans text-meta text-text-dark/50">
                {t('topicLocked')}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-xs">
              {BADGE_TOPICS.filter(isBadgeTopic).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTopic(tp)}
                  aria-pressed={tp === topic}
                  className={cn(
                    'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
                    tp === topic ? 'ring-2 ring-violet ring-offset-2' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <Badge topic={tp} />
                </button>
              ))}
            </div>
          )}
        </fieldset>

        {/* Cover */}
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

        {/* Description */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="collection-desc"
            className="font-sans text-body-small font-medium text-text-dark"
          >
            {t('descriptionLabel')}
          </label>
          <textarea
            id="collection-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            maxLength={300}
            rows={2}
            className="w-full rounded-sm border border-border-light bg-foreground/[0.03] px-md py-sm font-sans text-body-small text-foreground placeholder:text-foreground/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>

        {/* Sections — create only (seed). */}
        {!isEdit ? (
          <fieldset className="flex flex-col gap-sm">
            <legend className="font-sans text-body-small font-medium text-text-dark">
              {t('sectionsLabel')}
            </legend>
            <p className="font-sans text-meta text-text-dark/50">
              {t('sectionsHint')}
            </p>
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-xs">
                {suggestions.map((s) => {
                  const on = !dropped.has(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSuggestion(s)}
                      aria-pressed={on}
                      className={cn(
                        'inline-flex items-center gap-xs rounded-full border px-md py-xs font-sans text-meta transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                        on
                          ? 'border-violet bg-violet/10 text-text-dark'
                          : 'border-border-light text-text-dark/50',
                      )}
                    >
                      {on ? (
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      ) : null}
                      {s}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {customSections.length > 0 ? (
              <div className="flex flex-wrap gap-xs">
                {customSections.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-xs rounded-full border border-violet bg-violet/10 px-md py-xs font-sans text-meta text-text-dark"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomSections((prev) => prev.filter((x) => x !== s))
                      }
                      aria-label={t('sectionRemove', { name: s })}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-sm">
              <Input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomSection()
                  }
                }}
                placeholder={t('sectionAddPlaceholder')}
                maxLength={100}
              />
              <Button
                variant="secondary"
                size="small"
                onClick={addCustomSection}
                iconLeft={<Plus className="size-4" aria-hidden />}
              >
                {t('sectionAdd')}
              </Button>
            </div>
          </fieldset>
        ) : null}

        {/* Private note */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="collection-note"
            className="font-sans text-body-small font-medium text-text-dark"
          >
            {t('noteLabel')}
          </label>
          <textarea
            id="collection-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            maxLength={500}
            rows={2}
            className="w-full rounded-sm border border-border-light bg-foreground/[0.03] px-md py-sm font-sans text-body-small text-foreground placeholder:text-foreground/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
          <p className="font-sans text-meta text-text-dark/50">{t('notePrivate')}</p>
        </div>

        {/* Public toggle — EDIT only. */}
        {isEdit ? (
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            aria-pressed={isPublic}
            className="flex items-center justify-between rounded-md border border-border-light px-md py-sm text-left transition-colors duration-fast hover:bg-text-dark/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            <span className="flex items-center gap-sm">
              {isPublic ? (
                <Globe className="size-4 text-violet" aria-hidden />
              ) : (
                <Lock className="size-4 text-text-dark/50" aria-hidden />
              )}
              <span className="flex flex-col">
                <span className="font-sans text-body-small font-medium text-text-dark">
                  {isPublic ? t('publicOn') : t('publicOff')}
                </span>
                <span className="font-sans text-meta text-text-dark/50">
                  {isPublic ? t('publicOnHint') : t('publicOffHint')}
                </span>
              </span>
            </span>
            <span
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-base',
                isPublic ? 'bg-violet' : 'bg-text-dark/20',
              )}
              aria-hidden
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-archive transition-transform duration-base',
                  isPublic ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        ) : null}

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
