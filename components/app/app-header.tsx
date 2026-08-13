import { getTranslations } from 'next-intl/server'
import { Sparkle } from 'lucide-react'

/**
 * AppGreeting — the connected greeting (spec §7.4): "Good morning, [name] ✦ ·
 * Discover something inspiring today." The time-of-day greeting is resolved
 * server-side per request.
 *
 * This is the LEFT slot of AppShell's single top bar — it carries no border and
 * no page padding of its own (the shell bar owns both). Only Home and My Space
 * pass it; the other connected pages leave the shell's left slot empty and lead
 * with their own in-flow section header. The tagline is hidden on the narrowest
 * viewports so the greeting and bell share one row without wrapping.
 *
 * The spec's search bar routes to /search, which does not exist yet, so it is
 * omitted rather than shipped as a dead affordance (same discipline as the
 * public footer's un-linked legal pages).
 */
function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export async function AppGreeting({ displayName }: { displayName: string }) {
  const t = await getTranslations('AppHeader')
  const key = greetingKey(new Date().getHours())

  return (
    <div className="flex min-w-0 flex-col">
      <h1 className="flex items-center gap-xs truncate font-serif text-h3 text-foreground">
        {t(key, { name: displayName })}
        <Sparkle className="size-4 shrink-0 text-violet" aria-hidden />
      </h1>
      <p className="hidden truncate font-sans text-meta text-foreground/60 sm:block">
        {t('tagline')}
      </p>
    </div>
  )
}

/**
 * AppPageTitle — the LEFT slot of AppShell's top bar for section pages that lead
 * with a plain page title rather than the time-of-day greeting (My Space shows
 * "My Space", per the mockup — not "Good morning, [name]"). No border, no page
 * padding of its own; the shell bar owns both.
 */
export function AppPageTitle({ title }: { title: string }) {
  return (
    <h1 className="truncate font-serif text-h3 text-foreground">{title}</h1>
  )
}
