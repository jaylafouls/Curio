import type { BadgeTopic } from '@/components/ui'

/**
 * TopicScene — a branded, per-Topic vector illustration used as the third-tier
 * collection cover fallback: when a collection has no custom cover AND no links
 * with images to build a mosaic from, we still want it to read as a designed
 * object, not an empty tinted panel with a lone icon.
 *
 * Each scene is a small composed illustration (not a single centred pictogram)
 * drawn on the Topic's own badge colour, in the same muted, editorial vocabulary
 * as the badges and the orbital brand marks. Colours are derived from the badge
 * token so a scene always matches its Badge and the design system stays single-
 * source: the base tone fills the field, a lighter tint and a darker shade give
 * the composition depth, and a warm "paper" highlight (the Archive background)
 * carries the focal shapes.
 *
 * Rendered as an inline SVG with a viewBox and preserveAspectRatio="xMidYMid
 * slice" so one scene fills any cover aspect (16/9 card, 4/5 overlay, 3/1 hero)
 * without distortion. Purely decorative — every call site keeps the text Badge,
 * so the scene carries aria-hidden and needs no label.
 *
 * All 10 Core Topics have a bespoke scene (recette point 5c). The tonal-field
 * branch below is a safety net only — it never renders in practice since every
 * BadgeTopic is mapped, but it keeps the component total for any future Topic.
 */

/** The 10 badge tokens as hex, mirrored from tailwind.config (§1.5). Kept local
 *  so the SVG can reference them directly (SVG fill can't read Tailwind classes). */
const BADGE_HEX: Record<BadgeTopic, string> = {
  travel: '#D9C6A6',
  design: '#6A7B7A',
  food: '#C1694F',
  books: '#8B6F47',
  culture: '#C98A4B',
  ideas: '#D4A63A',
  style: '#4A4550',
  photography: '#5B7088',
  beauty: '#D9AFAE',
  wellness: '#93AFA8',
}

// The Archive "paper" highlight (globals background token) — the warm off-white
// the focal shapes are drawn in, so scenes feel printed rather than screen-lit.
const PAPER = '#F5F1E8'

/** Lighten/darken a hex toward white/black by ratio (0..1). Small helper so each
 *  scene derives its depth tones from the one badge colour, not hardcoded sets. */
function shade(hex: string, ratio: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const mix = (c: number) =>
    ratio >= 0
      ? Math.round(c + (255 - c) * ratio)
      : Math.round(c * (1 + ratio))
  const to2 = (c: number) => c.toString(16).padStart(2, '0')
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`
}

type SceneProps = { base: string; light: string; dark: string; darker: string }

/** Travel — layered horizon: sun, rolling hills, a small winding path. */
function TravelScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      <circle cx="86" cy="34" r="15" fill={light} opacity="0.9" />
      <path d="M0 78 Q30 60 60 74 T120 70 V120 H0 Z" fill={dark} />
      <path d="M0 96 Q40 82 72 92 T120 90 V120 H0 Z" fill={darker} />
      <path
        d="M52 120 C58 100 46 92 56 78"
        stroke={PAPER}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="1 6"
        opacity="0.85"
      />
    </>
  )
}

/** Food — a plate setting seen from above: plate, fork, knife. */
function FoodScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      <circle cx="60" cy="60" r="30" fill={darker} opacity="0.55" />
      <circle cx="60" cy="60" r="26" fill={PAPER} />
      <circle cx="60" cy="60" r="17" fill={light} opacity="0.5" />
      {/* fork */}
      <g stroke={dark} strokeWidth="2" strokeLinecap="round">
        <line x1="26" y1="34" x2="26" y2="86" />
        <line x1="22" y1="34" x2="22" y2="48" />
        <line x1="30" y1="34" x2="30" y2="48" />
      </g>
      {/* knife */}
      <path
        d="M94 34 C90 44 90 54 94 60 L94 86"
        stroke={dark}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </>
  )
}

/** Books — three volumes on a shelf with one leaning, plus a bookmark ribbon. */
function BooksScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      <rect x="34" y="30" width="14" height="62" rx="2" fill={darker} />
      <rect x="52" y="30" width="14" height="62" rx="2" fill={PAPER} />
      <rect x="56" y="40" width="6" height="2.5" rx="1" fill={dark} opacity="0.6" />
      <rect x="56" y="47" width="6" height="2.5" rx="1" fill={dark} opacity="0.6" />
      <g transform="rotate(10 78 60)">
        <rect x="70" y="30" width="14" height="62" rx="2" fill={light} />
      </g>
      {/* shelf line */}
      <rect x="26" y="92" width="68" height="3" rx="1.5" fill={dark} />
      {/* bookmark ribbon on the paper volume */}
      <path d="M58 30 V50 L60 46 L62 50 V30 Z" fill={dark} opacity="0.7" />
    </>
  )
}

/** Culture — a columned facade (museum / monument), pediment + steps. */
function CultureScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* pediment */}
      <path d="M32 44 L60 28 L88 44 Z" fill={PAPER} />
      <path d="M32 44 L60 28 L88 44 Z" fill={dark} opacity="0.15" />
      {/* architrave */}
      <rect x="34" y="44" width="52" height="5" fill={darker} />
      {/* columns */}
      <g fill={PAPER}>
        <rect x="38" y="50" width="7" height="34" rx="1" />
        <rect x="52" y="50" width="7" height="34" rx="1" />
        <rect x="66" y="50" width="7" height="34" rx="1" />
        <rect x="80" y="50" width="7" height="34" rx="1" />
      </g>
      {/* column shading */}
      <g fill={dark} opacity="0.18">
        <rect x="43" y="50" width="2" height="34" />
        <rect x="57" y="50" width="2" height="34" />
        <rect x="71" y="50" width="2" height="34" />
        <rect x="85" y="50" width="2" height="34" />
      </g>
      {/* steps */}
      <rect x="30" y="84" width="60" height="5" fill={light} />
      <rect x="26" y="89" width="68" height="6" fill={dark} />
    </>
  )
}

/** Ideas — a lightbulb with a soft radiant glow and a filament. */
function IdeasScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* glow rays */}
      <g stroke={light} strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
        <line x1="60" y1="14" x2="60" y2="24" />
        <line x1="34" y1="24" x2="40" y2="31" />
        <line x1="86" y1="24" x2="80" y2="31" />
        <line x1="24" y1="50" x2="33" y2="52" />
        <line x1="96" y1="50" x2="87" y2="52" />
      </g>
      {/* bulb glass */}
      <circle cx="60" cy="52" r="22" fill={darker} opacity="0.4" />
      <circle cx="60" cy="52" r="19" fill={PAPER} />
      {/* filament */}
      <path
        d="M53 52 Q57 44 60 52 Q63 60 67 52"
        stroke={dark}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* base */}
      <rect x="52" y="72" width="16" height="5" rx="1" fill={dark} />
      <rect x="54" y="78" width="12" height="4" rx="1" fill={darker} />
      <rect x="56" y="83" width="8" height="4" rx="2" fill={darker} />
    </>
  )
}

/** Style — a hanging garment on a rack (dress silhouette on a hanger). */
function StyleScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* rail */}
      <rect x="24" y="30" width="72" height="3" rx="1.5" fill={darker} />
      {/* hanger hook */}
      <path
        d="M60 30 V24 Q60 20 56 20"
        stroke={dark}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M60 34 L44 44 M60 34 L76 44"
        stroke={dark}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* dress body */}
      <path
        d="M50 42 Q60 46 70 42 L78 90 Q60 96 42 90 Z"
        fill={PAPER}
      />
      <path
        d="M60 46 L60 92"
        stroke={dark}
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M50 42 Q60 46 70 42 L72 60 Q60 64 48 60 Z"
        fill={light}
        opacity="0.5"
      />
    </>
  )
}

/** Photography — a camera body with lens, viewfinder and shutter. */
function PhotographyScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* body */}
      <rect x="26" y="44" width="68" height="42" rx="6" fill={darker} />
      {/* prism hump */}
      <path d="M50 44 L56 34 L74 34 L80 44 Z" fill={dark} />
      {/* lens */}
      <circle cx="60" cy="66" r="17" fill={PAPER} />
      <circle cx="60" cy="66" r="12" fill={dark} opacity="0.55" />
      <circle cx="60" cy="66" r="6" fill={light} />
      <circle cx="55" cy="61" r="2.5" fill={PAPER} opacity="0.9" />
      {/* shutter button + flash */}
      <rect x="32" y="38" width="8" height="5" rx="2" fill={light} />
      <circle cx="86" cy="52" r="3" fill={light} />
    </>
  )
}

/** Beauty — a cosmetic bottle with a pump and a soft reflection. */
function BeautyScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* pump cap */}
      <rect x="55" y="24" width="10" height="10" rx="2" fill={darker} />
      <path
        d="M60 24 V18 H72"
        stroke={dark}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* neck */}
      <rect x="53" y="34" width="14" height="6" fill={dark} />
      {/* bottle body */}
      <rect x="42" y="40" width="36" height="52" rx="8" fill={PAPER} />
      {/* liquid */}
      <rect x="42" y="66" width="36" height="26" rx="8" fill={light} opacity="0.75" />
      <rect x="42" y="66" width="36" height="8" fill={light} opacity="0.4" />
      {/* highlight */}
      <rect x="48" y="46" width="4" height="40" rx="2" fill={PAPER} opacity="0.7" />
      {/* label */}
      <rect x="52" y="54" width="16" height="3" rx="1.5" fill={dark} opacity="0.4" />
    </>
  )
}

/** Wellness — a leaf sprig with dew, calm and organic. */
function WellnessScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* stem */}
      <path
        d="M60 94 Q58 66 60 40"
        stroke={darker}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* leaves */}
      <path d="M60 58 Q42 52 40 34 Q58 36 60 54 Z" fill={PAPER} />
      <path d="M60 70 Q78 64 80 46 Q62 48 60 66 Z" fill={light} />
      <path d="M60 46 Q46 40 46 26 Q58 30 60 42 Z" fill={dark} opacity="0.55" />
      {/* leaf midribs */}
      <g stroke={dark} strokeWidth="1" opacity="0.35" fill="none">
        <path d="M60 54 Q50 48 42 38" />
        <path d="M60 66 Q70 60 78 50" />
      </g>
      {/* dew */}
      <circle cx="49" cy="42" r="2" fill={PAPER} opacity="0.9" />
    </>
  )
}

/** Design — overlapping geometric shapes with a compass/pen accent. */
function DesignScene({ base, light, dark, darker }: SceneProps) {
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {/* composition of primitives */}
      <circle cx="48" cy="54" r="20" fill={PAPER} opacity="0.9" />
      <rect
        x="56"
        y="46"
        width="30"
        height="30"
        rx="3"
        fill={dark}
        opacity="0.55"
      />
      <path d="M70 30 L86 60 L54 60 Z" fill={light} opacity="0.85" />
      {/* pen nib accent */}
      <path
        d="M40 92 L52 80 L56 84 L44 96 Z"
        fill={darker}
      />
      <path d="M40 92 L44 96 L38 98 Z" fill={dark} />
    </>
  )
}

const SCENES: Partial<
  Record<BadgeTopic, (p: SceneProps) => React.ReactNode>
> = {
  travel: TravelScene,
  food: FoodScene,
  books: BooksScene,
  culture: CultureScene,
  ideas: IdeasScene,
  style: StyleScene,
  photography: PhotographyScene,
  beauty: BeautyScene,
  wellness: WellnessScene,
  design: DesignScene,
}

export function TopicScene({
  topic,
  className,
}: {
  topic: BadgeTopic
  className?: string
}) {
  const base = BADGE_HEX[topic]
  const tones: SceneProps = {
    base,
    light: shade(base, 0.28),
    dark: shade(base, -0.22),
    darker: shade(base, -0.4),
  }
  const Scene = SCENES[topic]

  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="presentation"
    >
      {Scene ? (
        Scene(tones)
      ) : (
        // No bespoke scene yet → a clean tonal field with a soft light band, so a
        // not-yet-drawn Topic still reads as designed, never broken.
        <>
          <rect width="120" height="120" fill={base} />
          <rect y="60" width="120" height="60" fill={tones.dark} opacity="0.5" />
          <circle cx="60" cy="46" r="16" fill={tones.light} opacity="0.7" />
        </>
      )}
    </svg>
  )
}
