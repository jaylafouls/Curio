import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/ui/cn'

/**
 * Badge (Topic) — full pill tinted by one of the 10 color.badge.* tokens
 * (Design Tokens §1.5). Two appearances observed in the mockups:
 *  - soft (default): tinted background + darker topic-colored text — the inline
 *    category chips ("Interior Design", "Japandi").
 *  - solid: full-strength fill over card cover images (the "TRAVEL" / "BOOKS"
 *    overlay badges, uppercase, on light text).
 *
 * `topic` must be one of the safelisted tokens so `bg-badge-${topic}` ships
 * (see tailwind.config safelist). Colors are muted mid-tones by design, so the
 * soft style keeps enough contrast by using the same token for text.
 */
export const BADGE_TOPICS = [
  'travel',
  'design',
  'food',
  'books',
  'culture',
  'ideas',
  'style',
  'photography',
  'beauty',
  'wellness',
] as const

export type BadgeTopic = (typeof BADGE_TOPICS)[number]
export type BadgeVariant = 'soft' | 'solid'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  topic: BadgeTopic
  variant?: BadgeVariant
}

// Per-topic classes are written out (not interpolated) so Tailwind's JIT sees
// every literal; the bg-badge-* set is also safelisted for the solid variant.
const softText: Record<BadgeTopic, string> = {
  travel: 'text-badge-travel',
  design: 'text-badge-design',
  food: 'text-badge-food',
  books: 'text-badge-books',
  culture: 'text-badge-culture',
  ideas: 'text-badge-ideas',
  style: 'text-badge-style',
  photography: 'text-badge-photography',
  beauty: 'text-badge-beauty',
  wellness: 'text-badge-wellness',
}

const softBg: Record<BadgeTopic, string> = {
  travel: 'bg-badge-travel/20',
  design: 'bg-badge-design/20',
  food: 'bg-badge-food/20',
  books: 'bg-badge-books/20',
  culture: 'bg-badge-culture/20',
  ideas: 'bg-badge-ideas/20',
  style: 'bg-badge-style/20',
  photography: 'bg-badge-photography/20',
  beauty: 'bg-badge-beauty/20',
  wellness: 'bg-badge-wellness/20',
}

const solidBg: Record<BadgeTopic, string> = {
  travel: 'bg-badge-travel',
  design: 'bg-badge-design',
  food: 'bg-badge-food',
  books: 'bg-badge-books',
  culture: 'bg-badge-culture',
  ideas: 'bg-badge-ideas',
  style: 'bg-badge-style',
  photography: 'bg-badge-photography',
  beauty: 'bg-badge-beauty',
  wellness: 'bg-badge-wellness',
}

export function Badge({
  topic,
  variant = 'soft',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-md py-xs font-sans text-meta font-medium',
        variant === 'soft'
          ? cn(softBg[topic], softText[topic])
          : cn(solidBg[topic], 'uppercase tracking-wide text-archive'),
        className,
      )}
      {...props}
    >
      {children ?? topic}
    </span>
  )
}
