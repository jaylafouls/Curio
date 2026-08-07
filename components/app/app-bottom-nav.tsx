'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'
import { BOTTOM_NAV } from './nav-items'

/**
 * AppBottomNav — the connected mobile bottom bar (spec §7.3), shown below lg
 * where the sidebar is hidden. Icon + label per item, active state from the
 * locale-stripped pathname.
 *
 * The spec's central FAB ("Add to Curio") is the Save Flow entry point — that
 * whole flow lands in chantier 11, so it is deliberately not rendered here yet
 * (a dead + button that opens nothing would be worse than its absence). This
 * chantier ships the read-only navigation frame; the FAB slots into the middle
 * of this bar when the save flow exists.
 */
export function AppBottomNav() {
  const t = useTranslations('AppNav')
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md lg:hidden"
      aria-label={t('primary')}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-2xs px-xs py-sm font-sans text-meta transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
                  active
                    ? 'text-foreground'
                    : 'text-foreground/50 hover:text-foreground',
                )}
              >
                <Icon className="size-5" strokeWidth={2} aria-hidden />
                {t(item.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
