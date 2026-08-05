/* eslint-disable @next/next/no-img-element */
import { Bookmark, MousePointerClick, ExternalLink } from 'lucide-react'
import type { CuratorAnalytics } from '@/lib/app/data'
import { EmptyState } from '@/components/public/empty-state'

/**
 * AnalyticsDashboard — the curator's basic analytics view (spec §4.1, §4.3,
 * §9.1). Presentational only: totals and the top-links list are computed by
 * getCuratorAnalytics and passed in. Pure read.
 *
 * Two headline tiles (Total saves — real; Clicks — honestly "not tracked yet"
 * because no click-event source populates clicks_count, 0004/0012) plus a
 * "top links" list. forks_count is absent by design (no fork mechanism exists).
 * A fresh account with no saved links renders the designed empty state — no fake
 * seeding (project non-negotiable).
 *
 * Thumbnails use a plain <img>, not next/image, matching SavedLinkRow: link
 * preview images come from arbitrary OG hosts that cannot be allow-listed in
 * next.config images.remotePatterns, so next/image would reject them at runtime.
 */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

type Labels = {
  totalSaves: string
  totalSavesHint: string
  clicks: string
  clicksUntracked: string
  topLinks: string
  topLinksSaves: string
  emptyTag: string
  emptyTitle: string
  emptyBody: string
}

export function AnalyticsDashboard({
  analytics,
  labels,
}: {
  analytics: CuratorAnalytics
  labels: Labels
}) {
  const hasData = analytics.linkCount > 0

  return (
    <div className="flex flex-col gap-2xl">
      {/* Headline tiles. */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
        <div className="flex flex-col gap-sm rounded-lg border border-border-light bg-foreground/[0.02] p-lg">
          <div className="flex items-center gap-sm text-foreground/60">
            <Bookmark className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="font-sans text-body-small">{labels.totalSaves}</span>
          </div>
          <p className="font-serif text-h1 text-foreground">
            {NUMBER_FORMAT.format(analytics.totalSaves)}
          </p>
          <p className="font-sans text-meta text-foreground/50">
            {labels.totalSavesHint}
          </p>
        </div>

        <div className="flex flex-col gap-sm rounded-lg border border-border-light bg-foreground/[0.02] p-lg">
          <div className="flex items-center gap-sm text-foreground/60">
            <MousePointerClick
              className="size-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            <span className="font-sans text-body-small">{labels.clicks}</span>
          </div>
          {/* clicks_count has no populating source yet (0004/0012): show an
              honest "not tracked" line, never a misleading 0. */}
          <p className="font-serif text-h3 text-foreground/40">—</p>
          <p className="font-sans text-meta text-foreground/50">
            {labels.clicksUntracked}
          </p>
        </div>
      </div>

      {/* Top links. */}
      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">{labels.topLinks}</h2>
        {hasData ? (
          <ul className="flex flex-col divide-y divide-border-light">
            {analytics.topLinks.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-md py-md first:pt-0"
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-light bg-foreground/[0.03]">
                  {link.image ? (
                    <img
                      src={link.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ExternalLink
                      className="size-4 text-foreground/30"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-sans text-body text-foreground">
                  {link.title}
                </span>
                <span className="flex shrink-0 items-center gap-xs font-sans text-body-small text-foreground/60">
                  <Bookmark className="size-4" strokeWidth={2} aria-hidden />
                  <span className="tabular-nums">
                    {NUMBER_FORMAT.format(link.saves)}
                  </span>
                  <span className="sr-only">{labels.topLinksSaves}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            tag={labels.emptyTag}
            title={labels.emptyTitle}
            body={labels.emptyBody}
          />
        )}
      </section>
    </div>
  )
}
