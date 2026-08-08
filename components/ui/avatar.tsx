import Image from 'next/image'
import { cn } from '@/lib/ui/cn'

/**
 * Avatar — circular. Sizes sm/md/lg. The `orbital` prop adds the faint ring +
 * slowly rotating colored dots seen around "You" in the hero and around the
 * profile avatar on My Space (Design Tokens §7 motion.orbital → animate-orbital,
 * a 30s linear loop). Motion is CSS-only (no JS), and respects
 * prefers-reduced-motion via the `motion-reduce:animate-none` utility.
 *
 * Presentational only: pass a resolved `src` (or none → initials fallback).
 */
export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  src?: string
  /** Used for alt text and the initials fallback when src is absent. */
  name: string
  size?: AvatarSize
  orbital?: boolean
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-8 text-meta',
  md: 'size-12 text-body-small',
  lg: 'size-24 text-h3',
}

// Orbit ring sits slightly outside the avatar; dot positions are the four
// cardinal points of the rotating ring.
const orbitPad: Record<AvatarSize, string> = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-3',
}

const DOTS = [
  { pos: 'left-1/2 top-0 -translate-x-1/2', color: 'bg-violet' },
  { pos: 'right-0 top-1/2 -translate-y-1/2', color: 'bg-badge-travel' },
  { pos: 'bottom-0 left-1/2 -translate-x-1/2', color: 'bg-badge-food' },
  { pos: 'left-0 top-1/2 -translate-y-1/2', color: 'bg-violet-soft' },
]

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  src,
  name,
  size = 'md',
  orbital = false,
  className,
}: AvatarProps) {
  const disc = (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-soft/40 font-sans font-medium text-foreground',
        sizeClasses[size],
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="96px"
          className="object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )

  if (!orbital) {
    return <span className={cn('inline-flex', className)}>{disc}</span>
  }

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        orbitPad[size],
        className,
      )}
    >
      {/* Rotating ring of dots — the whole layer spins slowly. */}
      <span
        className="pointer-events-none absolute inset-0 animate-orbital rounded-full border border-violet-soft/50 motion-reduce:animate-none"
        aria-hidden
      >
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className={cn(
              'absolute size-1.5 rounded-full',
              dot.pos,
              dot.color,
            )}
          />
        ))}
      </span>
      {disc}
    </span>
  )
}
