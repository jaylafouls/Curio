/**
 * StatList — the "your universe in numbers" figures on My Space (§8.9) and the
 * inline counter row on a public profile (§8.10). Real head-counts passed in by
 * the page; a fresh account reads 0 across the board, never a fake number.
 *
 * `layout`:
 *  - stack (default): a labelled vertical list for the My Space sidebar.
 *  - inline: a compact horizontal row (value over label) for the profile header.
 */
export type Stat = { label: string; value: number }

const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

export function StatList({
  stats,
  layout = 'stack',
}: {
  stats: Stat[]
  layout?: 'stack' | 'inline'
}) {
  if (layout === 'inline') {
    return (
      <dl className="flex flex-wrap gap-lg">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <dt className="order-2 font-sans text-meta text-foreground/50">
              {s.label}
            </dt>
            <dd className="order-1 font-serif text-h3 text-foreground">
              {NUMBER_FORMAT.format(s.value)}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <dl className="flex flex-col divide-y divide-border">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center justify-between py-sm first:pt-0 last:pb-0"
        >
          <dt className="font-sans text-body-small text-foreground/60">
            {s.label}
          </dt>
          <dd className="font-serif text-h3 text-foreground">
            {NUMBER_FORMAT.format(s.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
