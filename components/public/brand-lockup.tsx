import { cn } from '@/lib/ui/cn'

/**
 * BrandLockup — the small "c · curio" header/footer mark from the public
 * mockups (a compact orbital ring around a serif "c", then the "curio"
 * wordmark). Distinct from the large hero OrbitalLogo: this one is sized for a
 * nav bar and inherits `currentColor`, so it reads correctly on the light
 * Archive surface (dark ink) as well as on any dark section.
 *
 * Decorative-plus-text: the wordmark is real text, so the whole lockup is
 * announced naturally; the ring is aria-hidden.
 */
export function BrandLockup({
  className,
  wordmark = true,
}: {
  className?: string
  /** Show the "curio" wordmark next to the mark. Default true. */
  wordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-sm', className)}>
      <svg
        viewBox="0 0 100 100"
        width={32}
        height={32}
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <g className="origin-center animate-orbital motion-reduce:animate-none">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="rgb(var(--brand-violet) / 0.5)"
            strokeWidth="2"
          />
          <circle cx="50" cy="8" r="4" fill="rgb(var(--brand-violet))" />
          <circle cx="88" cy="60" r="2.4" fill="currentColor" opacity="0.35" />
        </g>
        <text
          x="50"
          y="52"
          dominantBaseline="central"
          textAnchor="middle"
          className="font-serif"
          fontSize="46"
          fill="currentColor"
        >
          c
        </text>
      </svg>
      {wordmark ? (
        <span className="font-serif text-h3 leading-none tracking-tight">
          curio
        </span>
      ) : null}
    </span>
  )
}
