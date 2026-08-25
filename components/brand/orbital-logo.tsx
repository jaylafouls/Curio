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
        {/* Orbit ring + 8 dots at 45° intervals, rotating as one group. */}
        <g className="origin-center animate-orbital motion-reduce:animate-none">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="rgb(var(--brand-violet) / 0.35)"
            strokeWidth="1"
          />
          {/* 0° (top) */}
          <circle cx="50" cy="8" r="2.4" fill="rgb(var(--brand-violet))" />
          {/* 45° */}
          <circle cx="79.7" cy="20.3" r="1.8" fill="rgb(var(--brand-archive))" />
          {/* 90° (right) */}
          <circle cx="92" cy="50" r="2.2" fill="rgb(var(--brand-violet))" />
          {/* 135° */}
          <circle cx="79.7" cy="79.7" r="1.6" fill="rgb(var(--brand-archive))" />
          {/* 180° (bottom) */}
          <circle cx="50" cy="92" r="2.0" fill="rgb(var(--brand-violet))" />
          {/* 225° */}
          <circle cx="20.3" cy="79.7" r="1.8" fill="rgb(var(--brand-archive))" />
          {/* 270° (left) */}
          <circle cx="8" cy="50" r="2.2" fill="rgb(var(--brand-violet))" />
          {/* 315° */}
          <circle cx="20.3" cy="20.3" r="1.6" fill="rgb(var(--brand-archive))" />
        </g>
        {/* The serif C sits still at the centre. Archive/light ink — this logo
            renders on the Cosmic onboarding/signup surface (no .dark), so a fixed
            light glyph is intentional. Driven by the brand var, not a raw hex. */}
        <text
          x="50"
          y="50"
          dominantBaseline="central"
          textAnchor="middle"
          className="font-serif"
          fontSize="46"
          fill="rgb(var(--brand-archive))"
        >
          C
        </text>
      </svg>
    </span>
  )
}
