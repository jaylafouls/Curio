import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/ui/cn'

/**
 * Button — pill-shaped CTA, the dominant control across every mockup.
 *
 * Variants (Design Tokens §8 / landing + onboarding mockups):
 *  - primary:   solid fill. Archive mode = button-primary-light (#0B0E14),
 *               Cosmic mode = violet. Driven by the --button-primary CSS var
 *               so the theme toggle flips it without prop changes.
 *  - secondary: outline pill (e.g. "Explore →" next to the primary CTA).
 *  - ghost:     text only, no border (inline/tertiary actions).
 *
 * Radius is always full (pill) — the single radius pattern for CTAs. Icons are
 * passed as lucide elements via iconLeft / iconRight (e.g. "Build your universe →").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'default' | 'small'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-sm rounded-full font-sans font-medium transition-colors duration-base disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2'

const variants: Record<ButtonVariant, string> = {
  // Uses the mode-aware CSS var so Archive shows near-black, Cosmic shows violet.
  primary:
    'bg-[var(--button-primary)] text-[var(--button-text)] hover:opacity-90',
  secondary:
    'border border-border-light bg-transparent text-foreground hover:bg-foreground/5',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/5',
}

const sizes: Record<ButtonSize, string> = {
  default: 'h-11 px-lg text-body-small',
  small: 'h-9 px-md text-meta',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'default',
      iconLeft,
      iconRight,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {iconLeft ? (
          <span className="shrink-0" aria-hidden>
            {iconLeft}
          </span>
        ) : null}
        {children}
        {iconRight ? (
          <span className="shrink-0" aria-hidden>
            {iconRight}
          </span>
        ) : null}
      </button>
    )
  },
)
