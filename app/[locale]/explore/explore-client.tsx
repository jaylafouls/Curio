'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, CollectionCard, CuratorCard, Button } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import { EmptyState } from '@/components/public/empty-state'
import type { PublicTopic, PublicCollection, PublicCurator } from '@/lib/public/data'

/**
 * ExploreClient — the interactive shell of /explore (spec §8.3). Owns the active
 * topic tab (All + the 10 Core Topics) and filters the public collections by it.
 * Data is fetched server-side and passed in; this component only handles the
 * tab state and rendering, so it stays a thin client boundary.
 *
 * The three feed sections (New & noteworthy / Explore by collections / Popular
 * on Curio) are all empty in production today (0 public collections, no
 * curators). Each renders its designed empty state rather than fake data; the
 * moment public rows exist they populate with no code change.
 */
export function ExploreClient({
  topics,
  collections,
  curators,
}: {
  topics: PublicTopic[]
  collections: PublicCollection[]
  curators: PublicCurator[]
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
      <div className="overflow-x-auto">
        <Tabs items={tabs} value={topic} onValueChange={setTopic} variant="pill" />
      </div>

      {/* New & noteworthy */}
      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">{t('newTitle')}</h2>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <CollectionCard
                  title={c.title}
                  topic={c.topic}
                  cover={c.cover ?? undefined}
                  owner={{ name: c.owner.name, avatar: c.owner.avatar ?? undefined }}
                  linksCount={c.linksCount}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            tag={t('emptyTag')}
            title={t('newEmptyTitle')}
            body={t('newEmptyBody')}
            action={
              <Link href="/signup">
                <Button variant="primary" size="small">
                  {t('emptyCta')}
                </Button>
              </Link>
            }
          />
        )}
      </section>

      {/* Explore by collections */}
      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">
          {t('collectionsTitle')}
        </h2>
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

      {/* Popular on Curio */}
      <section className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">
          {t('popularTitle')}
        </h2>
        {curators.length > 0 ? (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {curators.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/profile/${c.username}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <CuratorCard
                  name={c.displayName}
                  topic="ideas"
                  role={t('curatorRole')}
                  bio={c.bio ?? ''}
                  followers={0}
                  avatar={c.avatarUrl ?? undefined}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            tag={t('emptyTag')}
            title={t('popularEmptyTitle')}
            body={t('popularEmptyBody')}
          />
        )}
      </section>
    </div>
  )
}
