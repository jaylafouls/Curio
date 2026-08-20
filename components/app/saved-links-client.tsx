'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Tabs, Badge, BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { EmptyState } from '@/components/public/empty-state'
import { trackEvent } from '@/lib/analytics'
import { SavedLinkRow } from './saved-link-row'
import {
  MoveToCollectionButton,
  type MoveTargetCollection,
} from './move-to-collection-button'
import { searchSavedLinksAction } from '@/lib/app/actions'
import type {
  SavedLink,
  SavedScope,
  SavedCursor,
  SearchSavedLinksResult,
} from '@/lib/app/data'

/**
 * SavedLinksClient — the server-driven body of /saved (spec §8.11). The list is
 * NO LONGER an in-memory slice: every scope tab, filter, search keystroke (300ms
 * debounced) and "load more" calls searchSavedLinksAction, which runs the
 * keyset-paginated owner-RLS RPC (migration 0017). The page seeds the first
 * Inbox page + the move-target collection list; this component owns all
 * subsequent fetches and pagination.
 *
 * Scope model (locked): Inbox = collection_id IS NULL (default tab); All = every
 * save; per-collection scopes are offered from the user's collections. Filing a
 * link from the Inbox is a MOVE (see MoveToCollectionButton) — it leaves the
 * Inbox but stays in All and appears in its collection; never duplicated.
 *
 * Counts (Inbox / All) come from the server under the SAME text + structured
 * filters, so a search narrows every tab honestly.
 */
const ALL = '__all__' as const
const DEBOUNCE_MS = 300

type Filters = {
  scope: SavedScope
  collectionId: string | null
  q: string
  topic: BadgeTopic | typeof ALL
}

export function SavedLinksClient({
  initial,
  collections,
}: {
  initial: SearchSavedLinksResult
  collections: MoveTargetCollection[]
}) {
  const t = useTranslations('Saved')

  const [items, setItems] = useState<SavedLink[]>(initial.items)
  const [nextCursor, setNextCursor] = useState<SavedCursor | null>(
    initial.nextCursor,
  )
  const [counts, setCounts] = useState(initial.counts)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    scope: 'inbox',
    collectionId: null,
    q: '',
    topic: ALL,
  })

  // Debounced search term: `q` is what the input shows; `debouncedQ` is what we
  // actually query on, so typing doesn't fire a request per keystroke.
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(filters.q.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [filters.q])

  // A monotonically increasing request id guards against out-of-order responses:
  // only the latest fetch is allowed to commit its result to state.
  const reqId = useRef(0)

  const runSearch = useCallback(
    async (f: Filters, q: string) => {
      const myReq = ++reqId.current
      setLoading(true)
      const res = await searchSavedLinksAction({
        q,
        scope: f.scope,
        topicId: f.topic === ALL ? null : f.topic,
        collectionId: f.scope === 'collection' ? f.collectionId : null,
      })
      // A newer request superseded this one — drop the stale result.
      if (myReq !== reqId.current) return
      setLoading(false)
      if (!res.ok) return
      setItems(res.result.items)
      setNextCursor(res.result.nextCursor)
      setCounts(res.result.counts)

      // Consent-gated (no-op without analytics consent). Fire only on a real
      // search term, not on plain tab/filter changes.
      if (q) {
        trackEvent('search_query', {
          query: q,
          result_count: res.result.counts.total,
        })
      }
    },
    [],
  )

  // Re-run whenever the debounced query or any filter changes. The initial
  // Inbox page came from the server; this effect skips that exact first state
  // (empty query, inbox scope) so we don't immediately refetch on mount.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      // Only skip the refetch if the state still matches the server seed.
      if (
        debouncedQ === '' &&
        filters.scope === 'inbox' &&
        filters.topic === ALL
      ) {
        return
      }
    }
    void runSearch(filters, debouncedQ)
  }, [debouncedQ, filters, runSearch])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    const myReq = reqId.current // pagination must belong to the current filter set
    setLoadingMore(true)
    const res = await searchSavedLinksAction({
      q: debouncedQ,
      scope: filters.scope,
      topicId: filters.topic === ALL ? null : filters.topic,
      collectionId: filters.scope === 'collection' ? filters.collectionId : null,
      cursor: nextCursor,
    })
    setLoadingMore(false)
    // A filter change during the fetch invalidates this page.
    if (myReq !== reqId.current) return
    if (!res.ok) return
    setItems((prev) => [...prev, ...res.result.items])
    setNextCursor(res.result.nextCursor)
  }

  // Scope tabs: Inbox (default) · All, plus each collection as its own scope.
  const scopeTabs = useMemo(
    () => [
      { value: 'inbox', label: t('tabInbox'), count: counts.inbox },
      { value: 'all', label: t('tabAll'), count: counts.total },
      ...collections.map((c) => ({
        value: `collection:${c.id}`,
        label: c.name,
      })),
    ],
    [t, counts, collections],
  )

  const activeTabValue =
    filters.scope === 'collection'
      ? `collection:${filters.collectionId}`
      : filters.scope

  function pickScope(value: string) {
    if (value === 'inbox' || value === 'all') {
      setFilters((f) => ({ ...f, scope: value, collectionId: null }))
    } else if (value.startsWith('collection:')) {
      setFilters((f) => ({
        ...f,
        scope: 'collection',
        collectionId: value.slice('collection:'.length),
      }))
    }
  }

  // Topic filter options: the Badge palette. Server-driven now, so we offer the
  // full set rather than deriving from an in-memory slice (an empty Topic simply
  // returns no rows, and its count is reflected in the honest empty state).
  const topicOptions = BADGE_TOPICS

  function pickTopic(tp: BadgeTopic | typeof ALL) {
    setFilters((f) => ({ ...f, topic: tp }))
  }

  // After a move, update the row in place: if the current scope no longer
  // contains it (e.g. moved out of the Inbox while on the Inbox tab), drop it;
  // otherwise just re-tag its collectionId. Counts shift by one accordingly.
  function handleMoved(linkId: string, toCollectionId: string | null) {
    setItems((prev) => {
      const next = prev
        .map((l) => (l.id === linkId ? { ...l, collectionId: toCollectionId } : l))
        .filter((l) => {
          if (filters.scope === 'inbox') return l.collectionId === null
          if (filters.scope === 'collection')
            return l.collectionId === filters.collectionId
          return true
        })
      return next
    })
    setCounts((c) => ({
      total: c.total,
      inbox: toCollectionId === null ? c.inbox + 1 : Math.max(c.inbox - 1, 0),
    }))
  }

  const filtering = debouncedQ !== '' || filters.topic !== ALL

  return (
    <div className="flex flex-col gap-lg">
      <div className="overflow-x-auto">
        <Tabs
          items={scopeTabs}
          value={activeTabValue}
          onValueChange={pickScope}
        />
      </div>

      {/* Search box — debounced, drives a server fetch. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-foreground/40"
          aria-hidden
        />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className="w-full rounded-md border border-border bg-transparent py-sm pl-2xl pr-2xl font-sans text-body-small text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
        />
        {filters.q ? (
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, q: '' }))}
            aria-label={t('searchClear')}
            className="absolute right-md top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Topic filter row. */}
      <div
        role="group"
        aria-label={t('filterTopic')}
        className="flex flex-wrap items-center gap-xs"
      >
        <FilterPill
          active={filters.topic === ALL}
          onClick={() => pickTopic(ALL)}
          label={t('filterAll')}
        />
        {topicOptions.map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => pickTopic(tp)}
            aria-pressed={filters.topic === tp}
            className={cn(
              'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
              filters.topic === tp
                ? 'ring-2 ring-violet ring-offset-2'
                : 'opacity-70 hover:opacity-100',
            )}
          >
            <Badge topic={tp} />
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-lg text-center font-sans text-body-small text-foreground/50">
          {t('searching')}
        </p>
      ) : items.length > 0 ? (
        <>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((link) => (
              <li key={link.id}>
                <SavedLinkRow
                  link={link}
                  unsortedLabel={t('unsortedBadge')}
                  trailing={
                    collections.length > 0 ? (
                      <MoveToCollectionButton
                        userLinkId={link.id}
                        currentCollectionId={link.collectionId}
                        collections={collections}
                        onMoved={(to) => handleMoved(link.id, to)}
                      />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>

          {nextCursor ? (
            <div className="flex justify-center pt-sm">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-border px-lg py-sm font-sans text-body-small text-foreground/70 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-50"
              >
                {loadingMore ? t('loadingMore') : t('loadMore')}
              </button>
            </div>
          ) : null}
        </>
      ) : filtering ? (
        <EmptyState
          tag={t('emptyFilterTag')}
          title={t('emptyFilterTitle')}
          body={t('emptyFilterBody')}
        />
      ) : filters.scope === 'inbox' ? (
        <EmptyState
          tag={t('emptyUnsortedTag')}
          title={t('emptyUnsortedTitle')}
          body={t('emptyUnsortedBody')}
        />
      ) : (
        <EmptyState
          tag={t('emptyAllTag')}
          title={t('emptyAllTitle')}
          body={t('emptyAllBody')}
        />
      )}
    </div>
  )
}

/**
 * A neutral text filter pill (the "All" option). Mirrors the Tabs pill styling so
 * the rows read as one filter system.
 */
function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-md py-xs font-sans text-meta transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
        active
          ? 'bg-violet text-button-text-on-dark'
          : 'border border-border text-foreground/70 hover:bg-foreground/5',
      )}
    >
      {label}
    </button>
  )
}
