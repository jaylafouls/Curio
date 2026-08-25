import type { ReactNode } from 'react'
import { PublicHeader } from './public-header'
import { PublicFooter } from './public-footer'

/**
 * PublicShell — the frame shared by every non-authenticated marketing page
 * (Landing / Explore / Curators / Editorial / About). Sticky header, the page
 * content as <main>, then the footer, on the default light Archive surface.
 *
 * Pages that need a full-bleed dark hero (e.g. a Cosmic section) render it
 * inside `children`; the shell itself stays neutral so the header/footer read
 * consistently across all five pages.
 */
export function PublicShell({
  children,
  transparentHeader = false,
}: {
  children: ReactNode
  /** Header renders with no border/fill, absolutely positioned over the page's
   *  own top section — used on the landing hero, where header and hero share
   *  one continuous background with no seam (mockup-exact). */
  transparentHeader?: boolean
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader transparent={transparentHeader} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
