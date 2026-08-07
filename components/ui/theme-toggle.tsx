'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/**
 * ThemeToggle — visual Cosmic/Archive switch (Design Tokens §8), matching the
 * Settings > Theme (Light/Dark) control in the spec. Scope of this chantier is
 * the component only: it flips the `.dark` class on <html> so the switch is
 * demonstrable, but does NOT persist the choice — real persistence lands with
 * Auth/Settings later.
 *
 * Archive = light (default, no class). Cosmic = dark.
 *
 * Two modes:
 *  - UNCONTROLLED (no `mode` prop): self-manages, flipping `.dark` on <html> and
 *    syncing from the current document state on mount. Used in the showcase as a
 *    standalone demo.
 *  - CONTROLLED (`mode` + `onModeChange`): a pure visual control. It does NOT
 *    touch the DOM — the parent owns the class flip (e.g. Settings scopes `.dark`
 *    to the connected AppShell boundary, not <html>) and persistence. The toggle
 *    only reports the intended next mode via onModeChange.
 */
export type ThemeMode = 'archive' | 'cosmic'

export interface ThemeToggleProps {
  mode?: ThemeMode
  onModeChange?: (mode: ThemeMode) => void
  className?: string
}

export function ThemeToggle({
  mode: controlledMode,
  onModeChange,
  className,
}: ThemeToggleProps) {
  const [internal, setInternal] = useState<ThemeMode>('archive')
  const mode = controlledMode ?? internal

  // Sync initial internal state from the live document (uncontrolled use).
  useEffect(() => {
    if (controlledMode === undefined) {
      setInternal(
        document.documentElement.classList.contains('dark')
          ? 'cosmic'
          : 'archive',
      )
    }
  }, [controlledMode])

  const toggle = () => {
    const next: ThemeMode = mode === 'archive' ? 'cosmic' : 'archive'
    if (controlledMode === undefined) {
      // Uncontrolled: own the DOM side-effect — flip `.dark` on <html> so the
      // CSS-variable theme flips (globals.css .dark), and track internally.
      document.documentElement.classList.toggle('dark', next === 'cosmic')
      setInternal(next)
    }
    // Controlled: report the intended mode; the parent owns the class flip.
    onModeChange?.(next)
  }

  const isCosmic = mode === 'cosmic'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isCosmic}
      aria-label={isCosmic ? 'Switch to Archive (light)' : 'Switch to Cosmic (dark)'}
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-sm rounded-full border border-border px-sm py-xs font-sans text-meta text-foreground/70 transition-colors duration-fast hover:bg-foreground/5',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full transition-colors duration-fast',
          !isCosmic && 'bg-violet-soft/40 text-text-dark',
        )}
      >
        <Sun className="size-4" strokeWidth={2} aria-hidden />
      </span>
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full transition-colors duration-fast',
          isCosmic && 'bg-violet text-button-text-on-dark',
        )}
      >
        <Moon className="size-4" strokeWidth={2} aria-hidden />
      </span>
    </button>
  )
}
