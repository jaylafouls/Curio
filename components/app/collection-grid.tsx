import { Link } from '@/lib/i18n/navigation'
import { CollectionCard } from '@/components/ui'
import type { AppCollection } from '@/lib/app/data'

/**
 * CollectionGrid — a responsive grid of collection cards, reused by My Space
 * ("your latest collections", §8.9) and a public profile's Collections tab
 * (§8.10). Each card links to the public collection page /collections/[slug].
 *
 * linksCount is not yet a stored column (data model §6 — the trigger lands in
 * chantier 10), so cards read 0 for now; harmless while accounts are empty and
 * corrected the moment the counter exists.
 */
export function CollectionGrid({
  collections,
}: {
  collections: AppCollection[]
}) {
  return (
    <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c) => (
        <li key={c.id}>
          <Link
            href={`/collections/${c.slug}`}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
          >
            <CollectionCard
              title={c.title}
              topic={c.topic}
              cover={c.cover ?? undefined}
              owner={{ name: c.owner.name, avatar: c.owner.avatar ?? undefined }}
              linksCount={0}
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
