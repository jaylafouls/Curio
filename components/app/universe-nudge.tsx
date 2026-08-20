import { ArrowRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'

/**
 * UniverseNudge — the single next-action card in the My Universe sidebar
 * (point 5), replacing the old "Your universe is unique" editorial banner. The
 * page picks ONE nudge from data already tracked today (see getUniverseInsights)
 * and passes its resolved copy + destination here; this component is a dumb
 * presentational card so all i18n stays in the server page.
 *
 * When nothing needs doing (`kind: 'none'`), the page passes a neutral recap
 * instead of a chore — the card shape never changes, only its words.
 */
export function UniverseNudgeCard({
  title,
  body,
  ctaLabel,
  href,
}: {
  title: string
  body: string
  ctaLabel: string
  /** Locale-agnostic app path; the i18n Link prefixes the current locale. */
  href: string
}) {
  return (
    <section className="flex flex-col gap-sm rounded-lg border border-border bg-violet-soft/10 p-lg">
      <h2 className="font-serif text-h3 text-foreground">{title}</h2>
      <p className="font-sans text-body-small text-foreground/70">{body}</p>
      <Link
        href={href}
        className="mt-xs inline-flex items-center gap-xs font-sans text-body-small text-violet transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet rounded-sm"
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}
