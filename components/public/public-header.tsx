'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { ButtonLink } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { BrandLockup } from './brand-lockup'

/**
 * PublicHeader — the non-authenticated horizontal header:
 *
 *   [C · curio]   Explore · Curators · About   [Log in] [Sign up →]
 *
 * "Editorial" is intentionally NOT in this nav (Decisions Log §11.5, reaffirmed
 * 2026-08-27) — no content has been written for it yet, and Jay confirmed we
 * keep it out rather than expose an empty page. The route itself still exists,
 * just unlinked. "Curators" label (not "Founding Curators") per 2026-08-27 —
 * supersedes the scoped label from Decisions Log §19.1.
 * No "Home" link — the landing IS the home, reached via the brand lockup.
 * The centre nav collapses into a slide-down menu below the `md` breakpoint.
 */

const NAV = [
  { href: '/explore', key: 'explore' },
  { href: '/curators', key: 'curators' },
  { href: '/about', key: 'about' },
] as const

export function PublicHeader({ transparent = false }: { transparent?: boolean } = {}) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header
      className={cn(
        'top-0 z-40 w-full',
        transparent
          ? 'absolute border-b border-transparent bg-transparent'
          : 'sticky border-b border-border bg-background/80 backdrop-blur-md',
      )}
    >
      {/* Flat 24px inset at every breakpoint (2026-08-25: dropped the lg:px-3xl
          bump — Jay wants the whole top block shifted further left, closer to
          the true edge, not just harmonized at 64px). Same token as hero
          copy/collections/feature bar/footer below, so they all move together. */}
      <div className="mx-auto h-[86px] w-full max-w-[1280px]">
        <div className="flex h-full items-center justify-between px-lg">
        {/* Brand → landing. */}
        <Link
          href="/"
          className="rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
          aria-label={t('home')}
          onClick={() => setOpen(false)}
        >
          <BrandLockup />
        </Link>

        {/* Centre nav — desktop. */}
        <nav
          className="hidden items-center gap-xl md:flex"
          aria-label={t('primary')}
        >
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-sm font-sans text-body-small transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
                isActive(item.href)
                  ? 'text-foreground'
                  : 'text-foreground/60 hover:text-foreground',
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs — desktop. */}
        <div className="hidden items-center gap-sm md:flex">
          <Link
            href="/signup"
            className="rounded-full px-md py-sm font-sans text-body-small text-foreground/80 transition-colors duration-base hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
          >
            {t('login')}
          </Link>
          <ButtonLink
            href="/signup"
            size="small"
            iconRight={<ArrowRight className="size-4" />}
          >
            {t('signup')}
          </ButtonLink>
        </div>

        {/* Mobile toggle. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          aria-label={open ? t('closeMenu') : t('openMenu')}
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 md:hidden"
        >
          {open ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
        </div>
      </div>

      {/* Mobile slide-down nav. */}
      {open ? (
        <nav
          id="public-mobile-nav"
          aria-label={t('primary')}
          className="border-t border-border bg-background px-lg py-md md:hidden"
        >
          <ul className="flex flex-col gap-xs">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-sm px-sm py-sm font-sans text-body transition-colors',
                    isActive(item.href)
                      ? 'text-foreground'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-md flex flex-col gap-sm border-t border-border pt-md">
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full px-sm py-sm font-sans text-body text-foreground/80 transition-colors hover:text-foreground"
            >
              {t('login')}
            </Link>
            <ButtonLink
              href="/signup"
              onClick={() => setOpen(false)}
              iconRight={<ArrowRight className="size-4" />}
            >
              {t('signup')}
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
