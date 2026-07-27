import { createElement, type ReactNode } from 'react'
import { cn } from '@/lib/ui/cn'

/**
 * AccentText — the recurring brand headline pattern (Design Tokens §2.3):
 * a serif title with one word/segment set in italic violet
 * ("The internet worth *keeping*", "Explore inspiring *universes*").
 *
 * Instrument Serif has a single weight (400) so hierarchy is size-only (§2.1);
 * the `size` prop maps to the display/h1/h2/h3 tokens. Renders as an <h1> by
 * default; override with `as` for the right document outline.
 */
export type AccentTextSize = 'display' | 'h1' | 'h2' | 'h3'
export type AccentTextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span'

export interface AccentTextProps {
  /** Text before the accented segment. Include trailing space if needed. */
  before?: ReactNode
  /** The emphasized segment — rendered italic violet. */
  accent: ReactNode
  /** Text after the accented segment. Include leading space if needed. */
  after?: ReactNode
  size?: AccentTextSize
  as?: AccentTextTag
  className?: string
}

const sizeClasses: Record<AccentTextSize, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
}

export function AccentText({
  before,
  accent,
  after,
  size = 'display',
  as = 'h1',
  className,
}: AccentTextProps) {
  return createElement(
    as,
    {
      className: cn(
        'font-serif leading-tight text-foreground',
        sizeClasses[size],
        className,
      ),
    },
    before,
    <em className="italic text-violet">{accent}</em>,
    after,
  )
}
