'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, CollectionCard } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import { EmptyState } from '@/components/public/empty-state'
import type { PublicTopic, PublicCollection } from '@/lib/public/data'

/**
 * ExploreClient — the interactive shell of /explore (spec §8.3). Three
 * sections, in this order (2026-09-05, Jay):
 *  1. Populaire  — collections ranked by all-time collection_follows.
 *  2. Tendances  — collections ranked by collection_follows in the last 14
 *     days. A real, distinct signal from Populaire (not a relabelled copy) —
 *     see getPublicTrendingCollections's doc comment.
 *  3. Explorer par collections — the full topic-tab browse (owns the active
 *     tab state; the only section that filters by topic).
 * Populaire/Tendances used to show CURATOR cards under "Popular on Curio" —
 * fixed: both are collections now, matching the section's own heading.
 * Every section renders its designed empty state on 0 rows rather than fake
 * data — this is still true today for a topic with nothing public in it.
 */
export function ExploreClient({
  topics,
  collections,
  popular,
  trending,
}: {
  topics: PublicTopic[]
  collections: PublicCollection[]
  popular: PublicCollection[]
  trending: PublicCollection[]
}) {
  const t = useTranslations('Explore')
  const [topic, setTopic] = useState<string>('all')

  const tabs = useMemo(
    () => [
      { value: 'all', label: t('tabAll') },
      ...topics.map((tp) => ({ value: tp.id, label: tp.label })),
    ],
    [topics, t],
  )

  const filtered = useMemo(
    () =>
      topic === 'all'
        ? collections
        : collections.filter((c) => c.topic === topic),
    [collections, topic],
  )

  return (
    <div className="flex flex-col gap-2xl">
      {/* Populaire sur Curio */}
      <CollectionRow
        title={t('popularTitle')}
        items={popular}
        emptyTag={t('emptyTag')}
        emptyTitle={t('popularEmptyTitle')}
        emptyBody={t('popularEmptyBody')}
      />

      {/* Tendances */}
      <CollectionRow
        title={t('trendingTitle')}
        items={trending}
        emptyTag={t('emptyTag')}
        emptyTitle={t('trendingEmptyTitle')}
        emptyBody={t('trendingEmptyBody')}
      />

      {/* Explorer par collections — the only section with topic tabs. */}
      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">
          {t('collectionsTitle')}
        </h2>
        <div className="overflow-x-auto">
          <Tabs items={tabs} value={topic} onValueChange={setTopic} variant="pill" />
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <CollectionCard
                  title={c.title}
                  topic={c.topic}
                  cover={c.cover ?? undefined}
                  mosaic={c.mosaic}
                  owner={{ name: c.owner.name, avatar: c.owner.avatar ?? undefined }}
                  linksCount={c.linksCount}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            tag={t('emptyTag')}
            title={t('collectionsEmptyTitle')}
            body={t('collectionsEmptyBody')}
          />
        )}
      </section>
    </div>
  )
}

/** A titled row of collection cards, or the designed empty state on 0 rows.
 * Shared by Populaire and Tendances — same card, same grid, different data. */
function CollectionRow({
  title,
  items,
  emptyTag,
  emptyTitle,
  emptyBody,
}: {
  title: string
  items: PublicCollection[]
  emptyTag: string
  emptyTitle: string
  emptyBody: string
}) {
  return (
    <section className="flex flex-col gap-lg">
      <h2 className="font-serif text-h2 text-foreground">{title}</h2>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
            >
              <CollectionCard
                title={c.title}
                topic={c.topic}
                cover={c.cover ?? undefined}
                mosaic={c.mosaic}
                owner={{ name: c.owner.name, avatar: c.owner.avatar ?? undefined }}
                linksCount={c.linksCount}
              />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState tag={emptyTag} title={emptyTitle} body={emptyBody} />
      )}
    </section>
  )
}
