import { forwardRef, type InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/**
 * Input — two shapes seen in the mockups:
 *  - text (default): radius sm (8px), thin border-light. Used in forms
 *    (sign in / sign up onboarding screens).
 *  - search: full pill with an inset magnifier icon (the "Search for anything…"
 *    bar in Home / My Space headers).
 *
 * States: default, focus (violet ring), error (food/terracotta border +
 * ring), disabled. `error` is a boolean flag; the message itself is rendered
 * by the caller so this stays purely presentational.
 */
export type InputVariant = 'text' | 'search'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant
  error?: boolean
}

const base =
  'w-full font-sans text-body-small text-foreground placeholder:text-foreground/40 transition-colors duration-fast bg-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'text', error = false, className, disabled, ...props },
  ref,
) {
  // The border + ring live on a wrapper so the search icon sits inside the
  // same focus target and the ring wraps the whole control.
  const shell = cn(
    'flex items-center gap-sm border bg-foreground/[0.03] transition-colors duration-fast',
    variant === 'search'
      ? 'rounded-full px-md h-11'
      : 'rounded-sm px-md h-11',
    error
      ? 'border-badge-food focus-within:ring-2 focus-within:ring-badge-food/40'
      : 'border-border focus-within:border-violet focus-within:ring-2 focus-within:ring-violet/30',
    disabled && 'opacity-50',
  )

  return (
    <div className={cn(shell, className)}>
      {variant === 'search' ? (
        <Search
          className="size-4 shrink-0 text-foreground/40"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={base}
        {...props}
      />
    </div>
  )
})
