'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/ui/cn'

/**
 * CollectionBreadcrumb — a lightweight "My Space / <collection>" trail shown on
 * the OWNER view of a collection (spec: a collection should read as a workspace,
 * not an isolated page). The restored sidebar already carries global nav, but the
 * breadcrumb gives an explicit one-click return that also works on mobile (where
 * the sidebar is a bottom nav) and orients the owner within their own space.
 *
 * Owner-only by construction: it is rendered inside CollectionPrivateClient's
 * owned branch and the owner overlay, both of which only mount for a signed-in
 * owner — so it never appears on the public/anon render and never enters the
 * cookie-free ISR cache.
 */
export function CollectionBreadcrumb({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  const t = useTranslations('CollectionDetail')
  return (
    <nav
      aria-label={t('breadcrumbMySpace')}
      className={cn(
        'flex items-center gap-xs font-sans text-meta text-foreground/50',
        className,
      )}
    >
      <Link
        href="/my-space"
        className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        {t('breadcrumbMySpace')}
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-foreground/30" aria-hidden />
      <span className="truncate text-foreground/70">{title}</span>
    </nav>
  )
}
