'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SlidersHorizontal } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { ButtonLink, CollectionCard, type BadgeTopic } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { cn } from '@/lib/ui/cn'
import type { FeedCollectionWithTeaser } from '@/lib/home/data'
import type { AppTopic } from '@/lib/app/data'

/**
 * HomeFeedClient — the interactive core of /home (spec §8.2): the horizontal
 * Topic filter row (All + the 10 Core Topics + "Personalize"), the
 * Following / For you / Trending tabs, and the "Picked for you" collection
 * grid that reacts to both.
 *
 * The three feeds are fetched server-side and passed in whole; switching a tab
 * or a Topic filter is pure client-side narrowing — no refetch, no algorithm
 * beyond the deterministic server queries. "Personalize" routes to
 * /home/personalize — a connected placeholder for the future feed-personalisation
 * surface (no dedicated personalise UI exists in V1 yet). It deliberately does
 * NOT jump to /my-space: sending the user to an unrelated page read as a bug in
 * recette. The placeholder keeps the connected shell so the user never feels
 * bounced out.
 *
 * Empty handling honours the project rule (no fake seeding): when the active
 * tab has nothing, the designed empty state shows. The Following tab's empty
 * state is the spec's "Follow curators to see their discoveries here" → /curators.
 */
type Tab = 'following' | 'forYou' | 'trending'

const ALL = '__all__'

export function HomeFeedClient({
  following,
  forYou,
  trending,
  topics,
}: {
  following: FeedCollectionWithTeaser[]
  forYou: FeedCollectionWithTeaser[]
  trending: FeedCollectionWithTeaser[]
  topics: AppTopic[]
}) {
  const t = useTranslations('Home')
  // Default to "For you" — the personalised surface a returning user expects
  // to land on (Following can be empty for a fresh account).
  const [tab, setTab] = useState<Tab>('forYou')
  const [topicFilter, setTopicFilter] = useState<BadgeTopic | typeof ALL>(ALL)

  const active = tab === 'following' ? following : tab === 'trending' ? trending : forYou

  const filtered = useMemo(
    () =>
      topicFilter === ALL
        ? active
        : active.filter((c) => c.topic === topicFilter),
    [active, topicFilter],
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'following', label: t('tabFollowing') },
    { id: 'forYou', label: t('tabForYou') },
    { id: 'trending', label: t('tabTrending') },
  ]

  return (
    <div className="flex flex-col gap-xl">
      {/* Topic filter row — horizontally scrollable on narrow screens. */}
      <div className="flex items-center gap-sm">
        <div
          className="-mx-lg flex flex-1 items-center gap-xs overflow-x-auto px-lg pb-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0"
          role="group"
          aria-label={t('topicFilterLabel')}
        >
          <FilterPill
            active={topicFilter === ALL}
            onClick={() => setTopicFilter(ALL)}
          >
            {t('topicAll')}
          </FilterPill>
          {topics.map((tp) => (
            <FilterPill
              key={tp.id}
              active={topicFilter === tp.id}
              onClick={() => setTopicFilter(tp.id)}
            >
              {tp.label}
            </FilterPill>
          ))}
        </div>
        <Link
          href="/home/personalize"
          className="inline-flex shrink-0 items-center gap-xs rounded-full border border-border px-md py-xs font-sans text-meta font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {t('personalize')}
        </Link>
      </div>

      {/* Tabs. */}
      <div
        className="flex items-center gap-lg border-b border-border"
        role="tablist"
        aria-label={t('feedTabsLabel')}
      >
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              '-mb-px border-b-2 pb-sm font-sans text-body-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
              tab === tb.id
                ? 'border-violet text-foreground'
                : 'border-transparent text-foreground/50 hover:text-foreground/80',
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Picked for you grid. */}
      <section aria-label={t('pickedForYou')} className="flex flex-col gap-lg">
        <h2 className="font-serif text-h2 text-foreground">
          {t('pickedForYou')}
        </h2>
        {filtered.length > 0 ? (
          <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
                >
                  <CollectionCard
                    variant="overlay"
                    title={c.title}
                    topic={c.topic}
                    cover={c.cover ?? undefined}
                    description={c.description ?? undefined}
                    owner={{
                      name: c.owner.name,
                      avatar: c.owner.avatar ?? undefined,
                    }}
                    linksCount={c.linksCount}
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : tab === 'following' ? (
          <EmptyState
            tag={t('followingEmptyTag')}
            title={t('followingEmptyTitle')}
            body={t('followingEmptyBody')}
            action={
              <ButtonLink href="/curators">
                {t('followingEmptyCta')}
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            tag={t('feedEmptyTag')}
            title={t('feedEmptyTitle')}
            body={
              topicFilter === ALL ? t('feedEmptyBody') : t('feedEmptyTopicBody')
            }
          />
        )}
      </section>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-md py-xs font-sans text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
        active
          ? 'border-violet bg-violet/10 text-foreground'
          : 'border-border text-foreground/60 hover:bg-foreground/[0.04]',
      )}
    >
      {children}
    </button>
  )
}
