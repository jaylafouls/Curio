'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { ButtonLink } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { BrandLockup } from './brand-lockup'

/**
 * PublicHeader — the non-authenticated horizontal header (spec §7.1):
 *
 *   [C · curio]   Explore · Curators   [Log in] [Sign up →]
 *
 * "Editorial" is temporarily delinked (its content was never written — Decisions
 * Log §11.5, still open); the /editorial route stays live and re-adding the link
 * is a one-liner. "About" moved to the footer to keep the primary nav minimal.
 *
 * No "Home" link — the landing IS the home, reached via the brand lockup. The
 * centre nav collapses into a slide-down menu below the `md` breakpoint so the
 * bar stays legible at 440px. Active link is derived from the locale-stripped
 * pathname (usePathname already drops the /en|/fr prefix).
 *
 * Both auth CTAs point at /signup: the auth screen (écran 02) is a single
 * combined sign-up / log-in surface with an inline toggle, so there is no
 * separate /login route to link to. Light Archive surface by default.
 */

const NAV = [
  { href: '/explore', key: 'explore' },
  { href: '/curators', key: 'curators' },
] as const

export function PublicHeader() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-lg">
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
