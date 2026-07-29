import { TopicIcon } from '@/components/brand/topic-icon'
import { cn } from '@/lib/ui/cn'
import type { PublicTopic } from '@/lib/public/data'

/**
 * OrbitalViz — the landing hero visualisation (spec §8.1): "You" at the centre
 * with the Core Topics arranged symmetrically in orbit. The layout is generated
 * algorithmically (evenly spaced angles), NOT from a designer-supplied asset —
 * this is the resolved open point: nodes are placed at `i * 360/N` around a
 * ring so the composition is balanced for any topic count.
 *
 * Collection counts are REAL (from getPublicTopics). Today they are all 0, so we
 * render only the topic label — never a fabricated "128 collections". Once real
 * public collections exist the count appears automatically.
 *
 * The whole figure is decorative in aggregate but each node carries its topic
 * name as text, so the topic set is still announced. The ring/orbit lines are
 * aria-hidden. Sized responsively: a compact ring at 440px, larger on desktop.
 */

// Node radius as a % of the container half-size, per breakpoint feel. Kept < 50
// so nodes stay inside the box with room for their labels.
const ORBIT_RADIUS_PCT = 42

export function OrbitalViz({ topics }: { topics: PublicTopic[] }) {
  const n = Math.max(topics.length, 1)

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[min(80vw,32rem)]"
      role="img"
      aria-label="Curio orbital map: you at the centre, surrounded by the core topics"
    >
      {/* Orbit rings — purely decorative. */}
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full border border-border-light"
      />
      <div
        aria-hidden
        className="absolute inset-[24%] rounded-full border border-violet/20"
      />

      {/* Centre — "You". */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-violet font-serif text-h3 text-archive shadow-glow-violet">
          You
        </span>
      </div>

      {/* Topic nodes on the ring. */}
      {topics.map((topic, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2 // start at top
        const x = 50 + ORBIT_RADIUS_PCT * Math.cos(angle)
        const y = 50 + ORBIT_RADIUS_PCT * Math.sin(angle)
        return (
          <div
            key={topic.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-xs"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={cn(
                'flex size-11 items-center justify-center rounded-full border border-border-light bg-background text-foreground/80 shadow-sm sm:size-14',
              )}
            >
              <TopicIcon name={topic.icon} className="size-5 sm:size-6" strokeWidth={2} />
            </span>
            <span className="whitespace-nowrap font-sans text-meta font-medium text-foreground/80">
              {topic.label}
            </span>
            {topic.collectionCount > 0 ? (
              <span className="font-sans text-meta text-foreground/50">
                {topic.collectionCount}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
