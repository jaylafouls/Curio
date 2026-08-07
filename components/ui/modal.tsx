'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/**
 * Modal — controlled overlay. Two layouts:
 *  - center (default): panel centered, radius lg, shadow-md.
 *  - sheet: bottom sheet that slides up from the bottom edge (mobile pattern).
 *
 * Presentational + minimal behavior only: it owns open/close plumbing (Escape,
 * overlay click, scroll lock, initial focus) but no data. Rendering is gated on
 * `open` so closed modals cost nothing; the fade/slide is the fade-in keyframe.
 */
export type ModalVariant = 'center' | 'sheet'

export interface ModalProps {
  open: boolean
  onClose: () => void
  variant?: ModalVariant
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  variant = 'center',
  title,
  children,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    // Remember the trigger so focus can be restored when the modal closes.
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focusable descendants, recomputed per-key so it tracks dynamic content.
    const getFocusable = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : []

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // Trap Tab/Shift+Tab within the panel so focus can't reach the
      // backgrounded page while aria-modal claims the dialog is exclusive.
      const focusable = getFocusable()
      if (focusable.length === 0) {
        // Nothing focusable inside — keep focus on the panel itself.
        e.preventDefault()
        panel?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || active === panel) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into the panel for keyboard + screen-reader users.
    panel?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Return focus to the element that opened the modal.
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const isSheet = variant === 'sheet'

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-cosmic/40 backdrop-blur-sm',
        isSheet ? 'items-end justify-center' : 'items-center justify-center p-lg',
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // Always-light Archive sheet, even when the connected shell is in
          // Cosmic (.dark). Pin the mode-aware tokens back to their Archive
          // values on the panel so shared primitives rendered inside (Input,
          // secondary Button, dividers) keep dark ink + the #DADAD6 border, not
          // the Cosmic white-hairline they would otherwise inherit from .dark.
          'relative flex flex-col gap-md bg-archive p-lg shadow-md focus:outline-none animate-fade-in [--border-opacity:1] [--border:218_218_214] [--foreground:17_17_17]',
          isSheet
            ? 'w-full max-w-xl rounded-t-xl pb-2xl'
            : 'w-full max-w-lg rounded-lg',
          className,
        )}
      >
        {isSheet ? (
          <span
            className="mx-auto mb-xs h-1 w-10 shrink-0 rounded-full bg-border"
            aria-hidden
          />
        ) : null}
        <div className="flex items-start justify-between gap-md">
          {title ? (
            <h2 className="font-serif text-h2 leading-tight text-text-dark">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-xs text-text-dark/60 transition-colors duration-fast hover:bg-text-dark/5 hover:text-text-dark"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="font-sans text-body text-text-dark/80">{children}</div>
      </div>
    </div>
  )
}
