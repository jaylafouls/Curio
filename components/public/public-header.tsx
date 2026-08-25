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
 *   [C · curio]   Explore · Founding Curators · Editorial · About   [Log in] [Sign up →]
 *
 * Four nav links per the 01-curio-reference-4x.png pixel-perfect reference
 * (2026-08-23 landing rebuild). "Editorial" was previously delinked because
 * no content had been written (Decisions Log §11.5) — the route has always
 * stayed live, and the new reference restores its nav position, so it's
 * relinked here. Flag to Jay: if there's still no Editorial content, this
 * exposes an empty page again — worth a quick check before shipping.
 * No "Home" link — the landing IS the home, reached via the brand lockup.
 * The centre nav collapses into a slide-down menu below the `md` breakpoint.
 */

const NAV = [
  { href: '/explore', key: 'explore' },
  { href: '/curators', key: 'curators' },
  { href: '/editorial', key: 'editorial' },
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
      {/* Same horizontal rhythm as PageContainer (24px → 64px at lg) so the
          header lines up with every other section on the page — no more
          bespoke percentage padding drifting out of sync with the rest. */}
      <div className="mx-auto h-[86px] w-full max-w-[1280px]">
        <div className="flex h-full items-center justify-between px-lg lg:px-3xl">
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
