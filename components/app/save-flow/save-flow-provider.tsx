'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Link2, ImagePlus, FolderPlus, X } from 'lucide-react'
import { cn } from '@/lib/ui/cn'
import { useRouter } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import type { SaveTargetCollection } from '@/lib/links/data'
import { CollectionModal } from '@/components/app/collection-modal'
import { SaveFlowModal, type SaveFlowInitialAction } from './save-flow-modal'

/**
 * SaveFlowProvider — the Save Flow entry point on every authenticated page
 * (ADD_ITEM_FLOW §1/§2.1/§3.1). It renders the trigger(s) and owns which surface
 * is open; the actual work lives in two already-built modals.
 *
 * Tap the trigger → the "Add to Curio" PANEL opens first (§2.1/§3.1, Parcours UX
 * "Panel s'ouvre"), a short menu of the three actions:
 *  - Save link         → the Save Flow wizard (paste URL → OG fetch → customize
 *                        → save to).
 *  - Add a custom image → the SAME wizard, opened with initialAction='image' so
 *                        the custom-image picker leads instead of the auto OG
 *                        fetch.
 *  - Create collection → the CollectionModal from chantier 10, opened DIRECTLY
 *                        (never through the link wizard); on success we route to
 *                        the new collection.
 *
 * Two trigger surfaces, one panel:
 *  - MOBILE (< lg): the central "+" FAB the bottom nav reserves a slot for
 *    (spec §7.3), floating above the sticky bottom bar. The panel opens as a
 *    bottom sheet, matching the mockup.
 *  - DESKTOP (≥ lg): the "Add to Curio" button fixed bottom-right of the content
 *    column, clear of the sidebar. The panel opens as a small popover above it.
 *
 * The wizard's own layout is responsive by the `variant` we pass (sheet on
 * mobile, center on desktop), resolved from a matchMedia listener so a resize or
 * rotation re-picks live.
 *
 * `targets` (the user's collections + sections for "Save to") is loaded
 * server-side by AppShell and passed down — already owner-scoped by RLS, no
 * client fetch. `locale` is threaded to the CollectionModal (localised copy) and
 * to post-create navigation.
 */

type Surface = null | 'panel' | 'wizard' | 'collection'

export function SaveFlowProvider({
  userId,
  locale,
  targets,
}: {
  userId: string
  locale: Locale
  targets: SaveTargetCollection[]
}) {
  const t = useTranslations('SaveFlow')
  const router = useRouter()

  const [surface, setSurface] = useState<Surface>(null)
  const [wizardAction, setWizardAction] = useState<SaveFlowInitialAction>('save')

  // Pick the wizard/panel layout from the viewport: sheet on mobile, center on
  // desktop. lg = 1024px (Tailwind default), the same breakpoint the sidebar /
  // bottom-nav swap on, so the trigger and its modal layout always agree.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Close the panel on Escape (the modals own their own Escape handling).
  useEffect(() => {
    if (surface !== 'panel') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSurface(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [surface])

  function openWizard(action: SaveFlowInitialAction) {
    setWizardAction(action)
    setSurface('wizard')
  }

  const actions: {
    key: SaveFlowInitialAction | 'collection'
    icon: typeof Link2
    title: string
    subtitle: string
    onClick: () => void
  }[] = [
    {
      key: 'save',
      icon: Link2,
      title: t('actionSaveLink'),
      subtitle: t('actionSaveLinkHint'),
      onClick: () => openWizard('save'),
    },
    {
      key: 'image',
      icon: ImagePlus,
      title: t('actionAddImage'),
      subtitle: t('actionAddImageHint'),
      onClick: () => openWizard('image'),
    },
    {
      key: 'collection',
      icon: FolderPlus,
      title: t('actionCreateCollection'),
      subtitle: t('actionCreateCollectionHint'),
      onClick: () => setSurface('collection'),
    },
  ]

  return (
    <>
      {/* MOBILE — central FAB above the bottom nav. */}
      <button
        type="button"
        onClick={() => setSurface('panel')}
        aria-label={t('open')}
        aria-haspopup="menu"
        aria-expanded={surface === 'panel'}
        className={cn(
          'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 lg:hidden',
          'flex size-14 items-center justify-center rounded-full',
          'bg-[var(--button-primary)] text-[var(--button-text)] shadow-md',
          'transition-transform duration-fast active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
        )}
      >
        <Plus className="size-6" strokeWidth={2.5} aria-hidden />
      </button>

      {/* DESKTOP — labelled "Add to Curio" button, bottom-right of the content. */}
      <button
        type="button"
        onClick={() => setSurface('panel')}
        aria-haspopup="menu"
        aria-expanded={surface === 'panel'}
        className={cn(
          'fixed bottom-8 right-8 z-50 hidden lg:inline-flex',
          'items-center gap-sm rounded-full px-lg h-12',
          'bg-[var(--button-primary)] text-[var(--button-text)] shadow-md',
          'font-sans text-body-small font-medium',
          'transition-opacity duration-base hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
        )}
      >
        <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        {t('open')}
      </button>

      {/* ── "Add to Curio" panel (§2.1/§3.1) ─────────────────────────────────
          Mobile: a bottom sheet. Desktop: a small popover anchored above the
          bottom-right button. Same three actions either way. */}
      {surface === 'panel' ? (
        <div
          className={cn(
            'fixed inset-0 z-50 flex bg-cosmic/40 backdrop-blur-sm',
            isDesktop ? 'items-end justify-end p-lg' : 'items-end justify-center',
          )}
          onClick={() => setSurface(null)}
          role="presentation"
        >
          <div
            role="menu"
            aria-label={t('panelTitle')}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative flex flex-col bg-archive shadow-md animate-fade-in',
              isDesktop
                ? 'mb-20 mr-2 w-80 rounded-lg p-sm'
                : 'w-full max-w-xl rounded-t-xl p-lg pb-2xl',
            )}
          >
            {!isDesktop ? (
              <span
                className="mx-auto mb-md h-1 w-10 shrink-0 rounded-full bg-border-light"
                aria-hidden
              />
            ) : null}
            <div className="mb-xs flex items-center justify-between px-sm">
              <h2 className="font-serif text-h3 leading-tight text-text-dark">
                {t('panelTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setSurface(null)}
                aria-label={t('cancel')}
                className="rounded-full p-xs text-text-dark/60 transition-colors duration-fast hover:bg-text-dark/5 hover:text-text-dark"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <ul className="flex flex-col">
              {actions.map((a) => {
                const Icon = a.icon
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={a.onClick}
                      className="flex w-full items-center gap-md rounded-md px-sm py-sm text-left transition-colors duration-fast hover:bg-text-dark/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
                        <Icon className="size-5" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-sans text-body-small font-medium text-text-dark">
                          {a.title}
                        </span>
                        <span className="font-sans text-meta text-text-dark/50">
                          {a.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Save link / Add a custom image → the wizard. */}
      <SaveFlowModal
        open={surface === 'wizard'}
        onClose={() => setSurface(null)}
        variant={isDesktop ? 'center' : 'sheet'}
        userId={userId}
        targets={targets}
        initialAction={wizardAction}
      />

      {/* Create collection → the chantier-10 modal, opened directly. */}
      {surface === 'collection' ? (
        <CollectionModal
          open
          onClose={() => setSurface(null)}
          onSaved={(res) => {
            setSurface(null)
            if (res.slug) router.push(`/collections/${res.slug}`)
            else router.refresh()
          }}
          locale={locale}
          userId={userId}
        />
      ) : null}
    </>
  )
}
