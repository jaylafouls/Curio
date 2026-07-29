import { getTranslations } from 'next-intl/server'
import { Sparkle } from 'lucide-react'
import { BrandLockup } from '@/components/public/brand-lockup'
import { Link } from '@/lib/i18n/navigation'

/**
 * AppHeader — the connected greeting header (spec §7.4): "Good morning, [name] ✦
 * · Discover something inspiring today." The time-of-day greeting is resolved
 * server-side per request.
 *
 * On mobile it also carries the brand lockup (the sidebar that would otherwise
 * hold it is hidden below lg). The spec's search bar and notification bell route
 * to /search and /notifications, which are deferred to a later chantier — they
 * are omitted rather than shipped as dead affordances (same discipline as the
 * public footer's un-linked legal pages).
 */
function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export async function AppHeader({ displayName }: { displayName: string }) {
  const t = await getTranslations('AppHeader')
  const nav = await getTranslations('AppNav')
  const key = greetingKey(new Date().getHours())

  return (
    <header className="border-b border-border-light bg-background px-lg py-lg lg:px-2xl">
      {/* Mobile-only brand lockup (desktop shows it in the sidebar). */}
      <Link
        href="/home"
        className="mb-md inline-flex rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet lg:hidden"
        aria-label={nav('home')}
      >
        <BrandLockup />
      </Link>

      <h1 className="flex items-center gap-xs font-serif text-h2 text-foreground">
        {t(key, { name: displayName })}
        <Sparkle className="size-5 text-violet" aria-hidden />
      </h1>
      <p className="mt-2xs font-sans text-body-small text-foreground/60">
        {t('tagline')}
      </p>
    </header>
  )
}
