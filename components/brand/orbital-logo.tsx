import { cn } from '@/lib/ui/cn'

/**
 * OrbitalLogo — the Curio "C" inside a slowly orbiting ring (mockup screens 01
 * & 06). Pure SVG so it stays crisp and needs no image asset. The orbit uses
 * the `orbital` keyframe from tailwind.config.ts (30s linear loop, §7 motion).
 *
 * Respects reduced motion: the ring stops rotating when the user prefers
 * reduced motion (motion-reduce:animate-none). Decorative — labelled via an
 * accessible name passed by the caller.
 */
export interface OrbitalLogoProps {
  /** Accessible label, e.g. "Curio". */
  label: string
  /** Pixel size of the square logo. Default 96. */
  size?: number
  className?: string
}

export function OrbitalLogo({ label, size = 96, className }: OrbitalLogoProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        aria-hidden
      >
        {/* Orbit ring + travelling dots, rotating as one group. */}
        <g className="origin-center animate-orbital motion-reduce:animate-none">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="rgb(120 92 255 / 0.35)"
            strokeWidth="1"
          />
          <circle cx="50" cy="8" r="2.4" fill="#785CFF" />
          <circle cx="88" cy="60" r="1.6" fill="rgb(250 251 242 / 0.7)" />
          <circle cx="16" cy="66" r="1.4" fill="rgb(250 251 242 / 0.5)" />
        </g>
        {/* The serif C sits still at the centre. */}
        <text
          x="50"
          y="50"
          dominantBaseline="central"
          textAnchor="middle"
          className="font-serif"
          fontSize="46"
          fill="rgb(250 251 242)"
        >
          C
        </text>
      </svg>
    </span>
  )
}
