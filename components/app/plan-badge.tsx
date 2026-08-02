import { cn } from '@/lib/ui/cn'
import type { PlanBadgeKind } from '@/lib/plans/data'

/**
 * PlanBadge — the small plan indicator shown next to a display name (spec §4.1):
 *   • founding → the permanent Founding Curator mark (violet, ✳).
 *   • pro      → the Curator Pro mark (never assigned during beta, but the render
 *                path exists so it lights up the moment a Pro plan is granted).
 *   • null     → nothing rendered (free plan, the beta default).
 *
 * Labels are resolved by the caller (server components own i18n) and passed in,
 * so this stays a pure presentational component with no next-intl dependency.
 * The glyph carries an accessible label; screen readers announce the plan, not a
 * decorative asterisk.
 */
export function PlanBadge({
  kind,
  label,
  className,
}: {
  kind: PlanBadgeKind
  /** Accessible + hover label, e.g. "Founding curator" / "Curator Pro". */
  label: string
  className?: string
}) {
  if (kind === null) return null

  if (kind === 'pro') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-violet px-sm py-2xs ' +
            'font-sans text-meta font-medium uppercase tracking-wide text-archive',
          className,
        )}
        title={label}
      >
        <span aria-hidden>Pro</span>
        <span className="sr-only">{label}</span>
      </span>
    )
  }

  // founding — the permanent violet mark already used on profiles.
  return (
    <span
      className={cn('text-violet', className)}
      title={label}
      aria-label={label}
    >
      <span aria-hidden>✳</span>
    </span>
  )
}
