import type { ReactNode } from 'react'
import { Badge, type BadgeTopic } from '@/components/ui'
import { cn } from '@/lib/ui/cn'

/**
 * EmptyState — the graceful "nothing here yet" panel reused across the public
 * pages while production has no public collections / curators / editorial. This
 * is the designed empty state (D002 pattern): a coming-soon tag, a serif title,
 * a short line, and an optional action — NEVER fake seeded data.
 *
 * On-token: dashed-free thin border card on a faint surface, generous vertical
 * padding so the empty section still holds the layout's rhythm.
 */
export function EmptyState({
  tag,
  tagTopic = 'ideas',
  title,
  body,
  action,
  className,
}: {
  tag: string
  tagTopic?: BadgeTopic
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-md rounded-lg border border-border-light bg-foreground/[0.02] px-lg py-3xl text-center',
        className,
      )}
    >
      <Badge topic={tagTopic}>{tag}</Badge>
      <h3 className="font-serif text-h3 text-foreground">{title}</h3>
      <p className="max-w-md font-sans text-body-small text-foreground/70">
        {body}
      </p>
      {action ? <div className="mt-xs">{action}</div> : null}
    </div>
  )
}
