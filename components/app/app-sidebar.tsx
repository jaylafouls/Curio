'use client'

import { useTranslations } from 'next-intl'
import { LogOut, Settings } from 'lucide-react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'
import { Avatar } from '@/components/ui'
import { BrandLockup } from '@/components/public/brand-lockup'
import { PRIMARY_NAV, MY_SPACE_NAV, type AppNavItem } from './nav-items'

/**
 * AppSidebar — the connected left nav (spec §7.2), desktop only (≥ lg). Brand
 * lockup, a primary group, a "My Space" group, then the signed-in user's
 * avatar/name footer with a Log out action. Hidden below lg, where the bottom
 * nav takes over (§7.3).
 *
 * Active state is derived from the locale-stripped pathname (usePathname drops
 * the /en|/fr prefix). Log out is a real POST to the sign-out route so it works
 * without JS; it lands the user back on the Welcome screen.
 */
export function AppSidebar({
  user,
  locale,
}: {
  user: { displayName: string; username: string; avatarUrl: string | null }
  /** Needed so the plain <form> sign-out action carries the locale prefix. */
  locale: string
}) {
  const t = useTranslations('AppNav')
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function renderItem(item: AppNavItem) {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-md rounded-md px-md py-sm font-sans text-body-small transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
            active
              ? 'bg-foreground/[0.06] text-foreground'
              : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground',
          )}
        >
          <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          {t(item.key)}
        </Link>
      </li>
    )
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="px-lg py-lg">
        <Link
          href="/home"
          className="inline-flex rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          aria-label={t('home')}
        >
          <BrandLockup />
        </Link>
      </div>

      <nav
        className="flex flex-1 flex-col gap-lg overflow-y-auto px-md"
        aria-label={t('primary')}
      >
        <ul className="flex flex-col gap-2xs">{PRIMARY_NAV.map(renderItem)}</ul>

        <div className="flex flex-col gap-2xs">
          <p className="px-md pb-2xs font-sans text-meta uppercase tracking-wide text-foreground/40">
            {t('mySpaceGroup')}
          </p>
          <ul className="flex flex-col gap-2xs">
            {MY_SPACE_NAV.map(renderItem)}
          </ul>
        </div>
      </nav>

      {/* User footer + log out. */}
      <div className="mt-auto border-t border-border p-md">
        <Link
          href="/my-space"
          className="flex items-center gap-sm rounded-md px-sm py-sm transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <Avatar src={user.avatarUrl ?? undefined} name={user.displayName} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-sans text-body-small text-foreground">
              {user.displayName}
            </span>
            <span className="truncate font-sans text-meta text-foreground/50">
              @{user.username}
            </span>
          </span>
        </Link>
        <Link
          href="/settings"
          aria-current={isActive('/settings') ? 'page' : undefined}
          className={cn(
            'mt-xs flex items-center gap-md rounded-md px-md py-sm font-sans text-body-small transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
            isActive('/settings')
              ? 'bg-foreground/[0.06] text-foreground'
              : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground',
          )}
        >
          <Settings className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          {t('settings')}
        </Link>
        <form action={`/${locale}/auth/signout`} method="post" className="mt-2xs">
          <button
            type="submit"
            className="flex w-full items-center gap-md rounded-md px-md py-sm font-sans text-body-small text-foreground/60 transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            <LogOut className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            {t('logout')}
          </button>
        </form>
      </div>
    </aside>
  )
}
