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
        width={56}
        height={56}
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
          {/* 8 dots at 45° intervals — 0°, 45°, 90°, … 315° */}
          <circle cx="50" cy="8" r="4" fill="rgb(var(--brand-violet))" />
          <circle cx="79.7" cy="20.3" r="3" fill="rgb(var(--brand-archive))" />
          <circle cx="92" cy="50" r="3.6" fill="rgb(var(--brand-violet))" />
          <circle cx="79.7" cy="79.7" r="2.6" fill="rgb(var(--brand-archive))" />
          <circle cx="50" cy="92" r="3.2" fill="rgb(var(--brand-violet))" />
          <circle cx="20.3" cy="79.7" r="3" fill="rgb(var(--brand-archive))" />
          <circle cx="8" cy="50" r="3.6" fill="rgb(var(--brand-violet))" />
          <circle cx="20.3" cy="20.3" r="2.6" fill="rgb(var(--brand-archive))" />
        </g>
        <text
          x="50"
          y="51"
          dominantBaseline="central"
          textAnchor="middle"
          className="font-serif"
          fontSize="42"
          fill="currentColor"
        >
          C
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
