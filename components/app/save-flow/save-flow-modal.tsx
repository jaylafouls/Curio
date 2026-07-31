'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Inbox,
  Plus,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { Modal, Button, Input, Badge } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/lib/i18n/navigation'
import { isSavableUrl } from '@/lib/links/normalize'
import { resolveLink, saveLink } from '@/lib/links/actions'
import { createCollection } from '@/lib/collections/actions'
import type { SaveTargetCollection } from '@/lib/links/data'
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui'

/**
 * SaveFlowModal — the full web Save Flow (ADD_ITEM_FLOW §2/§3), one component,
 * responsive by the `variant` prop the provider passes (center on desktop,
 * bottom sheet on mobile). Four steps:
 *
 *   1. URL      — paste the URL (or start from "Add a custom image" / "Create
 *                 collection", the two other panel actions). On Next, resolveLink
 *                 canonicalizes: a dedup hit shows the "X people saved this"
 *                 signal and reuses the frozen metadata; a miss OG-fetches.
 *   2. Customize — title (100), description (300), free tags, private note (500,
 *                 "Why are you saving this?"), and the custom image.
 *   3. Save to   — search + recent collections + optional section + "+ Create new
 *                 collection" + "Save to Unsorted". Writes user_links.
 *   4. Saved!    — "Saved to [name]" + "View in collection" / "Continue exploring".
 *
 * "Write a note" is NOT a separate action — it is the note field in step 2 (spec).
 * The custom image uploads straight to the user-images Storage bucket from the
 * browser (owner-scoped by the <uid>/ path prefix); only the public URL is sent
 * to saveLink.
 */

const IMAGE_BUCKET = 'user-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type Step = 'url' | 'customize' | 'saveTo' | 'done'

/**
 * How the flow was opened from the "Add to Curio" panel (§2.1/§3.1):
 *  - 'save'  → the plain link save (default): paste URL, OG-fetch prefills.
 *  - 'image' → "Add a custom image": same wizard, but on reaching Customize the
 *              file picker opens automatically so the user leads with their own
 *              image rather than the auto OG fetch.
 * ("Create collection" never opens this modal — the provider opens the
 * CollectionModal directly.)
 */
export type SaveFlowInitialAction = 'save' | 'image'

export type SaveFlowModalProps = {
  open: boolean
  onClose: () => void
  variant: 'center' | 'sheet'
  userId: string
  /** The user's collections + sections for the "Save to" picker. */
  targets: SaveTargetCollection[]
  /** Which panel action opened the flow (default: save a link). */
  initialAction?: SaveFlowInitialAction
}

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

export function SaveFlowModal({
  open,
  onClose,
  variant,
  userId,
  targets,
  initialAction = 'save',
}: SaveFlowModalProps) {
  const t = useTranslations('SaveFlow')
  const router = useRouter()

  // Local copy of targets so an inline "create new collection" can append.
  const [collections, setCollections] = useState<SaveTargetCollection[]>(targets)
  useEffect(() => setCollections(targets), [targets])

  const [step, setStep] = useState<Step>('url')

  // Step 1 — URL + resolution.
  const [url, setUrl] = useState('')
  const [linkId, setLinkId] = useState<string | null>(null)
  const [existing, setExisting] = useState(false)
  const [savesCount, setSavesCount] = useState(0)

  // Step 2 — customization.
  const [title, setTitle] = useState('')
  const [canonicalTitle, setCanonicalTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Step 3 — target.
  const [query, setQuery] = useState('')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionTopic, setNewCollectionTopic] = useState<BadgeTopic>('travel')

  // Step 4 — confirmation.
  const [savedTo, setSavedTo] = useState<{ name: string | null; slug: string | null }>({
    name: null,
    slug: null,
  })

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('url')
    setUrl('')
    setLinkId(null)
    setExisting(false)
    setSavesCount(0)
    setTitle('')
    setCanonicalTitle('')
    setDescription('')
    setNote('')
    setTags([])
    setNewTag('')
    setImage(null)
    setCustomImage(null)
    setQuery('')
    setCollectionId(null)
    setSectionId(null)
    setCreatingCollection(false)
    setNewCollectionName('')
    setSavedTo({ name: null, slug: null })
    setError(null)
  }, [])

  // Fresh flow each time the modal opens.
  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  // "Add a custom image" (§2.1/§3.1): once the link resolves and we land on the
  // Customize step, open the file picker automatically so the user leads with
  // their own image instead of the auto OG fetch. Fires once per resolve.
  const autoPickImage = useRef(false)
  useEffect(() => {
    if (open && step === 'customize' && autoPickImage.current) {
      autoPickImage.current = false
      fileRef.current?.click()
    }
  }, [open, step])

  function handleClose() {
    onClose()
  }

  // ── Step 1 → resolve ──────────────────────────────────────────────────────
  function handleResolve() {
    const raw = url.trim()
    if (!isSavableUrl(raw)) {
      setError(t('errorUrl'))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await resolveLink(raw)
      if (!res.ok) {
        setError(res.error === 'invalid_url' ? t('errorUrl') : t('errorServer'))
        return
      }
      setLinkId(res.linkId)
      setExisting(res.existing)
      setSavesCount(res.savesCount)
      setTitle(res.title)
      setCanonicalTitle(res.title)
      setDescription(res.description ?? '')
      setImage(res.image)
      // Lead with the custom-image picker when the flow was opened via
      // "Add a custom image"; the effect fires it on entering Customize.
      autoPickImage.current = initialAction === 'image'
      setStep('customize')
    })
  }

  // ── Custom image upload ───────────────────────────────────────────────────
  async function handleImageFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError(t('errorImageType'))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('errorImageSize'))
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${ext}` // RLS prefix = uid
      const { error: upErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        console.error('save-flow image upload failed', { message: upErr.message })
        setError(t('errorUpload'))
        return
      }
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
      setCustomImage(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  // ── Tags ──────────────────────────────────────────────────────────────────
  function addTag() {
    const v = newTag.trim()
    if (!v) return
    if (tags.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setNewTag('')
      return
    }
    setTags((prev) => [...prev, v])
    setNewTag('')
  }

  // ── Step 3 helpers ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(q))
  }, [collections, query])

  const activeCollection = useMemo(
    () => collections.find((c) => c.id === collectionId) ?? null,
    [collections, collectionId],
  )

  function pickCollection(id: string | null) {
    setCollectionId(id)
    setSectionId(null) // section is scoped to a collection; reset on change
    setCreatingCollection(false)
  }

  function handleCreateCollection() {
    const name = newCollectionName.trim()
    if (!name) {
      setError(t('errorCollectionName'))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createCollection({
        name,
        topicId: newCollectionTopic,
      })
      if (!res.ok) {
        setError(t('errorServer'))
        return
      }
      const created: SaveTargetCollection = {
        id: res.id,
        name,
        topic: newCollectionTopic,
        sections: [],
      }
      setCollections((prev) => [created, ...prev])
      setCollectionId(res.id)
      setSectionId(null)
      setCreatingCollection(false)
      setNewCollectionName('')
    })
  }

  // ── Step 3 → save ───────────────────────────────────────────────────────────
  function handleSave(toUnsorted: boolean) {
    if (!linkId) return
    setError(null)
    const targetCollection = toUnsorted ? null : collectionId
    const targetSection = toUnsorted ? null : sectionId
    startTransition(async () => {
      const res = await saveLink({
        linkId,
        urlOrigin: url.trim(),
        collectionId: targetCollection,
        sectionId: targetSection,
        // Only send an override when the user actually changed the title.
        titleOverride:
          title.trim() && title.trim() !== canonicalTitle ? title.trim() : null,
        note: note.trim() || null,
        tags,
        customImageUrl: customImage,
      })
      if (!res.ok) {
        setError(res.error === 'not_found' ? t('errorCollectionGone') : t('errorServer'))
        return
      }
      setSavedTo({ name: res.collectionName, slug: res.collectionSlug })
      setStep('done')
    })
  }

  // ── Header (title + optional back) per step ─────────────────────────────────
  const stepTitle =
    step === 'url'
      ? t('titleUrl')
      : step === 'customize'
        ? t('titleCustomize')
        : step === 'saveTo'
          ? t('titleSaveTo')
          : t('titleDone')

  const previewImage = customImage ?? image

  return (
    <Modal
      open={open}
      onClose={handleClose}
      variant={variant}
      title={stepTitle}
      className={variant === 'center' ? 'max-h-[90vh] overflow-y-auto' : 'max-h-[85vh] overflow-y-auto'}
    >
      {/* STEP 1 — URL */}
      {step === 'url' ? (
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <label
              htmlFor="save-url"
              className="font-sans text-body-small font-medium text-text-dark"
            >
              {t('urlLabel')}
            </label>
            <Input
              id="save-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleResolve()
                }
              }}
              placeholder={t('urlPlaceholder')}
              inputMode="url"
              autoFocus
              error={Boolean(error)}
            />
            <p className="font-sans text-meta text-text-dark/50">{t('urlHint')}</p>
          </div>

          {error ? (
            <p className="font-sans text-body-small text-badge-food" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-sm">
            <Button variant="ghost" onClick={handleClose} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleResolve}
              disabled={pending || url.trim().length === 0}
              iconRight={<ArrowRight className="size-4" aria-hidden />}
            >
              {pending ? t('resolving') : t('next')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 2 — Customize */}
      {step === 'customize' ? (
        <div className="flex flex-col gap-lg">
          {/* Preview + canonical signal. */}
          <div className="flex gap-md rounded-md border border-border-light p-sm">
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt=""
                className="size-16 shrink-0 rounded-sm object-cover"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-text-dark/5 text-text-dark/30">
                <ImagePlus className="size-5" aria-hidden />
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-center gap-2xs">
              <p className="truncate font-sans text-body-small font-medium text-text-dark">
                {title || canonicalTitle || url}
              </p>
              <p className="truncate font-sans text-meta text-text-dark/50">
                {url}
              </p>
              {existing && savesCount > 0 ? (
                <span className="mt-2xs inline-flex items-center gap-xs font-sans text-meta text-violet">
                  <Users className="size-3" aria-hidden />
                  {t('peopleSaved', { count: savesCount })}
                </span>
              ) : null}
            </div>
          </div>

          {/* Custom image controls. */}
          <div className="flex items-center gap-sm">
            <Button
              variant="secondary"
              size="small"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              iconLeft={<Upload className="size-4" aria-hidden />}
            >
              {uploading
                ? t('uploading')
                : customImage
                  ? t('imageReplace')
                  : t('imageAdd')}
            </Button>
            {customImage ? (
              <Button
                variant="ghost"
                size="small"
                onClick={() => setCustomImage(null)}
                iconLeft={<X className="size-4" aria-hidden />}
              >
                {t('imageRemove')}
              </Button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleImageFile(f)
                e.target.value = ''
              }}
            />
          </div>

          {/* Title (editable, 100). Live counter mirrors the mockup ("54/100"). */}
          <div className="flex flex-col gap-xs">
            <div className="flex items-baseline justify-between gap-sm">
              <label
                htmlFor="save-title"
                className="font-sans text-body-small font-medium text-text-dark"
              >
                {t('titleFieldLabel')}
              </label>
              <span className="font-sans text-meta tabular-nums text-text-dark/40">
                {title.length}/100
              </span>
            </div>
            <Input
              id="save-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={t('titleFieldPlaceholder')}
            />
          </div>

          {/* Description (editable, 300). Live counter mirrors the mockup ("98/300"). */}
          <div className="flex flex-col gap-xs">
            <div className="flex items-baseline justify-between gap-sm">
              <label
                htmlFor="save-desc"
                className="font-sans text-body-small font-medium text-text-dark"
              >
                {t('descriptionLabel')}
              </label>
              <span className="font-sans text-meta tabular-nums text-text-dark/40">
                {description.length}/300
              </span>
            </div>
            <textarea
              id="save-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={t('descriptionPlaceholder')}
              className="w-full rounded-sm border border-border-light bg-foreground/[0.03] px-md py-sm font-sans text-body-small text-foreground placeholder:text-foreground/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
            />
            <p className="font-sans text-meta text-text-dark/50">
              {t('descriptionHint')}
            </p>
          </div>

          {/* Tags (free). */}
          <div className="flex flex-col gap-xs">
            <span className="font-sans text-body-small font-medium text-text-dark">
              {t('tagsLabel')}
            </span>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-xs">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-xs rounded-full border border-violet bg-violet/10 px-md py-xs font-sans text-meta text-text-dark"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                      aria-label={t('tagRemove', { name: tag })}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-sm">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder={t('tagsPlaceholder')}
                maxLength={40}
              />
              <Button
                variant="secondary"
                size="small"
                onClick={addTag}
                iconLeft={<Plus className="size-4" aria-hidden />}
              >
                {t('tagAdd')}
              </Button>
            </div>
          </div>

          {/* Private note (500). */}
          <div className="flex flex-col gap-xs">
            <label
              htmlFor="save-note"
              className="font-sans text-body-small font-medium text-text-dark"
            >
              {t('noteLabel')}
            </label>
            <textarea
              id="save-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={t('notePlaceholder')}
              className="w-full rounded-sm border border-border-light bg-foreground/[0.03] px-md py-sm font-sans text-body-small text-foreground placeholder:text-foreground/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
            />
            <p className="font-sans text-meta text-text-dark/50">{t('notePrivate')}</p>
          </div>

          {error ? (
            <p className="font-sans text-body-small text-badge-food" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-between gap-sm">
            <Button
              variant="ghost"
              onClick={() => setStep('url')}
              disabled={pending}
              iconLeft={<ArrowLeft className="size-4" aria-hidden />}
            >
              {t('back')}
            </Button>
            <Button
              onClick={() => setStep('saveTo')}
              disabled={pending || uploading}
              iconRight={<ArrowRight className="size-4" aria-hidden />}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 3 — Save to */}
      {step === 'saveTo' ? (
        <div className="flex flex-col gap-lg">
          {/* Search. */}
          <Input
            variant="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />

          {/* Unsorted option — always available. */}
          <button
            type="button"
            onClick={() => pickCollection(null)}
            aria-pressed={collectionId === null && !creatingCollection}
            className={cn(
              'flex items-center gap-md rounded-md border px-md py-sm text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
              collectionId === null && !creatingCollection
                ? 'border-violet bg-violet/10'
                : 'border-border-light hover:bg-text-dark/[0.03]',
            )}
          >
            <Inbox className="size-4 text-text-dark/50" aria-hidden />
            <span className="flex flex-col">
              <span className="font-sans text-body-small font-medium text-text-dark">
                {t('unsorted')}
              </span>
              <span className="font-sans text-meta text-text-dark/50">
                {t('unsortedHint')}
              </span>
            </span>
            {collectionId === null && !creatingCollection ? (
              <Check className="ml-auto size-4 text-violet" aria-hidden />
            ) : null}
          </button>

          {/* Recent / searched collections. */}
          <div className="flex flex-col gap-xs">
            <p className="font-sans text-meta uppercase tracking-wide text-text-dark/40">
              {query.trim() ? t('searchResults') : t('recentCollections')}
            </p>
            {filtered.length > 0 ? (
              <ul className="flex max-h-56 flex-col gap-xs overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCollection(c.id)}
                      aria-pressed={collectionId === c.id}
                      className={cn(
                        'flex w-full items-center gap-sm rounded-md border px-md py-sm text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                        collectionId === c.id
                          ? 'border-violet bg-violet/10'
                          : 'border-border-light hover:bg-text-dark/[0.03]',
                      )}
                    >
                      <Badge topic={c.topic} />
                      <span className="truncate font-sans text-body-small text-text-dark">
                        {c.name}
                      </span>
                      {collectionId === c.id ? (
                        <Check className="ml-auto size-4 shrink-0 text-violet" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-body-small text-text-dark/50">
                {query.trim() ? t('noMatches') : t('noCollections')}
              </p>
            )}
          </div>

          {/* Optional section, only when a collection with sections is chosen. */}
          {activeCollection && activeCollection.sections.length > 0 ? (
            <div className="flex flex-col gap-xs">
              <p className="font-sans text-meta uppercase tracking-wide text-text-dark/40">
                {t('sectionOptional')}
              </p>
              <div className="flex flex-wrap gap-xs">
                <button
                  type="button"
                  onClick={() => setSectionId(null)}
                  aria-pressed={sectionId === null}
                  className={cn(
                    'rounded-full border px-md py-xs font-sans text-meta transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                    sectionId === null
                      ? 'border-violet bg-violet/10 text-text-dark'
                      : 'border-border-light text-text-dark/60',
                  )}
                >
                  {t('noSection')}
                </button>
                {activeCollection.sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSectionId(s.id)}
                    aria-pressed={sectionId === s.id}
                    className={cn(
                      'rounded-full border px-md py-xs font-sans text-meta transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                      sectionId === s.id
                        ? 'border-violet bg-violet/10 text-text-dark'
                        : 'border-border-light text-text-dark/60',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Create new collection — inline. */}
          {creatingCollection ? (
            <div className="flex flex-col gap-sm rounded-md border border-violet/40 bg-violet/[0.04] p-md">
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder={t('newCollectionPlaceholder')}
                maxLength={100}
                autoFocus
              />
              <div className="flex flex-wrap gap-xs">
                {BADGE_TOPICS.filter(isBadgeTopic).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setNewCollectionTopic(tp)}
                    aria-pressed={tp === newCollectionTopic}
                    className={cn(
                      'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
                      tp === newCollectionTopic
                        ? 'ring-2 ring-violet ring-offset-2'
                        : 'opacity-70 hover:opacity-100',
                    )}
                  >
                    <Badge topic={tp} />
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-sm">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setCreatingCollection(false)}
                  disabled={pending}
                >
                  {t('cancel')}
                </Button>
                <Button size="small" onClick={handleCreateCollection} disabled={pending}>
                  {pending ? t('creating') : t('createCollection')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCreatingCollection(true)
                setCollectionId(null)
                setSectionId(null)
              }}
              className="inline-flex items-center gap-sm self-start rounded-full border border-dashed border-border-light px-md py-xs font-sans text-body-small text-text-dark/70 transition-colors hover:border-violet hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
            >
              <Plus className="size-4" aria-hidden />
              {t('createNewCollection')}
            </button>
          )}

          {error ? (
            <p className="font-sans text-body-small text-badge-food" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-between gap-sm">
            <Button
              variant="ghost"
              onClick={() => setStep('customize')}
              disabled={pending}
              iconLeft={<ArrowLeft className="size-4" aria-hidden />}
            >
              {t('back')}
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={pending || (collectionId === null ? false : false)}
            >
              {pending
                ? t('saving')
                : collectionId
                  ? t('saveToCollection')
                  : t('saveToUnsorted')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 4 — Saved! */}
      {step === 'done' ? (
        <div className="flex flex-col items-center gap-lg py-md text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-violet/15 text-violet">
            <Check className="size-7" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex flex-col gap-2xs">
            <p className="font-serif text-h3 text-text-dark">
              {savedTo.name
                ? t('savedToNamed', { name: savedTo.name })
                : t('savedToUnsorted')}
            </p>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row">
            {savedTo.slug ? (
              <Button
                onClick={() => {
                  onClose()
                  router.push(`/collections/${savedTo.slug}`)
                }}
                iconRight={<ArrowRight className="size-4" aria-hidden />}
              >
                {t('viewInCollection')}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onClose()
                  router.push('/saved')
                }}
                iconRight={<ArrowRight className="size-4" aria-hidden />}
              >
                {t('viewInUnsorted')}
              </Button>
            )}
            <Button variant="secondary" onClick={handleClose}>
              {t('continueExploring')}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
