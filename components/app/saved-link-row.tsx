/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui'
import type { SavedLink } from '@/lib/app/data'

/**
 * SavedLinkRow — one row of the /saved list: thumbnail, title, source domain and
 * an "Unsorted" marker when the link sits outside any collection. The title area
 * links out to the original URL (rel=noopener nofollow, new tab); the optional
 * `trailing` slot (the "Move to collection" affordance) sits OUTSIDE that anchor
 * so it is not a nested interactive element — the row is a flex container, not a
 * whole-row link. Click-count tracking is a separate write concern.
 */
function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function SavedLinkRow({
  link,
  unsortedLabel,
  trailing,
}: {
  link: SavedLink
  unsortedLabel: string
  /** Optional trailing control (e.g. the move affordance), rendered outside the link-out anchor. */
  trailing?: ReactNode
}) {
  return (
    <div className="group flex items-center gap-md rounded-md px-sm py-md transition-colors hover:bg-foreground/[0.03]">
      <a
        href={link.urlOrigin}
        target="_blank"
        rel="noreferrer noopener nofollow"
        className="flex min-w-0 flex-1 items-center gap-md rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-foreground/[0.03]">
          {link.image ? (
            <img src={link.image} alt="" className="size-full object-cover" />
          ) : (
            <ExternalLink
              className="size-5 text-foreground/30"
              strokeWidth={2}
              aria-hidden
            />
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-2xs">
          <span className="truncate font-sans text-body text-foreground">
            {link.title}
          </span>
          {link.description ? (
            <span className="line-clamp-1 font-sans text-body-small text-foreground/60">
              {link.description}
            </span>
          ) : null}
          <span className="flex items-center gap-sm">
            <span className="truncate font-sans text-meta text-foreground/50">
              {sourceDomain(link.urlOrigin)}
            </span>
            {link.collectionId === null ? (
              <Badge topic="ideas" variant="soft">
                {unsortedLabel}
              </Badge>
            ) : null}
          </span>
        </span>

        <ExternalLink
          className="size-4 shrink-0 text-foreground/30 transition-colors group-hover:text-foreground/60"
          strokeWidth={2}
          aria-hidden
        />
      </a>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
