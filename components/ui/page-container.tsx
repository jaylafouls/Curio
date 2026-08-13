import { createElement, type ReactNode } from 'react'
import { cn } from '@/lib/ui/cn'

/**
 * PageContainer — the single owner of the connected-page content wrapper: the
 * centred column (`mx-auto w-full`), its max-width, and the responsive page
 * padding. Every connected page (Home, My Space, Profile, Projects, Saved,
 * Analytics, Notifications) previously re-typed the same
 * `mx-auto w-full max-w-* px-lg py-2xl lg:px-2xl` string, drifting only on the
 * max-width. This primitive fixes the padding formula in one place and exposes
 * the width as a `size` prop, so the rhythm stays consistent across pages.
 *
 * Padding (Design Tokens §3, "densité resserrée"):
 * - Horizontal: `px-lg` (24px) on mobile → `lg:px-3xl` (64px) desktop, moving
 *   toward the mockups' ~80–96px page gutter without eating laptop width.
 * - Vertical: `py-xl` (32px) on mobile → `lg:py-2xl` (48px) desktop — a tighter
 *   vertical rhythm on small screens that breathes on desktop.
 *
 * `size` maps to the four max-width tokens the connected pages use by design
 * intent (feed pages wide, reading pages narrow). `className` composes on top so
 * grid pages (Home, My Space) add their `grid …` layout and flex pages
 * (Analytics, Notifications) add `flex flex-col gap-*`. `as` overrides the
 * element for the right document semantics (e.g. `section`).
 */
export type PageContainerSize = '3xl' | '4xl' | '5xl' | '6xl'
export type PageContainerTag = 'div' | 'section' | 'main'

export interface PageContainerProps {
  /** Content max-width token. Defaults to `6xl` (the widest feed layout). */
  size?: PageContainerSize
  /** Element to render. Defaults to `div`. */
  as?: PageContainerTag
  className?: string
  children: ReactNode
}

const sizeClasses: Record<PageContainerSize, string> = {
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
}

export function PageContainer({
  size = '6xl',
  as = 'div',
  className,
  children,
}: PageContainerProps) {
  return createElement(
    as,
    {
      className: cn(
        'mx-auto w-full px-lg py-xl lg:px-3xl lg:py-2xl',
        sizeClasses[size],
        className,
      ),
    },
    children,
  )
}
