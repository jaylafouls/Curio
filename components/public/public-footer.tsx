import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { BrandLockup } from './brand-lockup'

/**
 * PublicFooter — quiet on-brand footer for the marketing pages. Brand lockup +
 * one-line tagline, the same primary nav, and a copyright line. Server
 * component (no interactivity), so it renders its localized copy directly.
 *
 * Legal links (Privacy Policy / Terms) are intentionally NOT linked yet: that
 * content does not exist (a rédactionnel task, flagged as a launch blocker in
 * chantier 7). Rather than ship dead links that 404, they land here once the
 * pages exist. The nav below points only at routes that render.
 *
 * "Editorial" is temporarily delinked here too (content never written —
 * Decisions Log §11.5). "About" lives in the footer only (removed from the
 * header) to keep the primary nav minimal.
 */

const NAV = [
  { href: '/explore', key: 'explore' },
  { href: '/curators', key: 'curators' },
  { href: '/about', key: 'about' },
] as const

export async function PublicFooter() {
  const t = await getTranslations('Nav')
  const f = await getTranslations('Footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-md px-lg py-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-xs flex-col gap-sm">
            <BrandLockup className="text-foreground" />
            <p className="font-sans text-body-small text-foreground/60">
              {f('tagline')}
            </p>
          </div>

          <nav aria-label={t('primary')}>
            <ul className="flex flex-wrap gap-lg">
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="font-sans text-body-small text-foreground/60 transition-colors duration-base hover:text-foreground"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="font-sans text-meta text-foreground/50">
          {f('copyright', { year })}
        </p>
      </div>
    </footer>
  )
}
