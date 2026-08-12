'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, Badge, BADGE_TOPICS, type BadgeTopic } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { EmptyState } from '@/components/public/empty-state'
import { SavedLinkRow } from './saved-link-row'
import type { SavedLink } from '@/lib/app/data'

/**
 * SavedLinksClient — the tabbed + filtered body of /saved (§8.11 "Filtres +
 * grille"). The page fetches every saved link once (server-side, under owner
 * RLS); this client component owns the All / Unsorted tab AND the Topic +
 * sub-category filters, so every filter is a no-round-trip toggle over the same
 * list. "Unsorted" = collection_id IS NULL (data model §9).
 *
 * Filters (chantier link-subcategories, T04):
 *  - Topic pill row — "All" + only the Topics that actually appear in the user's
 *    saves. A Topic with zero saved links is never offered (no fake filters, same
 *    rule as no fake rows). Topics render as coloured Badge pills, the idiom used
 *    everywhere topics appear (Home filters, CollectionModal, Save Flow).
 *  - Sub-category pill row — shown only when a single Topic that defines
 *    sub-categories is selected; "All" + the distinct sub-category labels present
 *    in that Topic's saves. Labels come verbatim from the reference table.
 *
 * Filters compose with the All/Unsorted tab (the tab counts reflect the full
 * set; the filters narrow within the active tab). Empty states are per-context:
 * a fresh account sees "your saved links will appear here"; a filtered-to-empty
 * view sees a neutral "nothing here" — never fake rows.
 */
type Tab = 'all' | 'unsorted'

const ALL = '__all__' as const

export function SavedLinksClient({ links }: { links: SavedLink[] }) {
  const t = useTranslations('Saved')
  const [tab, setTab] = useState<Tab>('all')
  const [topic, setTopic] = useState<BadgeTopic | typeof ALL>(ALL)
  const [subcategory, setSubcategory] = useState<string>(ALL)

  const unsorted = useMemo(
    () => links.filter((l) => l.collectionId === null),
    [links],
  )

  // The tab slice (All vs Unsorted) is the base the filters narrow within.
  const inTab = tab === 'unsorted' ? unsorted : links

  // Topics actually present in the current tab slice, in Badge palette order —
  // only offer a Topic the user has something under (no empty filters).
  const topicOptions = useMemo(() => {
    const present = new Set<BadgeTopic>()
    for (const l of inTab) if (l.topic) present.add(l.topic)
    return BADGE_TOPICS.filter((tp) => present.has(tp))
  }, [inTab])

  // When the selected Topic disappears from the current tab (e.g. switching to
  // Unsorted), fall back to All rather than showing an impossible filter.
  const activeTopic = topic !== ALL && topicOptions.includes(topic) ? topic : ALL

  // Distinct sub-category labels present under the active Topic, ordered by first
  // appearance (the query is already saved_at desc). Only meaningful when a single
  // Topic is selected; "All" collapses the sub-category filter.
  const subcategoryOptions = useMemo(() => {
    if (activeTopic === ALL) return [] as string[]
    const labels: string[] = []
    const seen = new Set<string>()
    for (const l of inTab) {
      if (l.topic !== activeTopic || !l.subcategoryLabel) continue
      if (seen.has(l.subcategoryLabel)) continue
      seen.add(l.subcategoryLabel)
      labels.push(l.subcategoryLabel)
    }
    return labels
  }, [inTab, activeTopic])

  const activeSubcategory =
    subcategory !== ALL && subcategoryOptions.includes(subcategory)
      ? subcategory
      : ALL

  const visible = useMemo(() => {
    return inTab.filter((l) => {
      if (activeTopic !== ALL && l.topic !== activeTopic) return false
      if (activeSubcategory !== ALL && l.subcategoryLabel !== activeSubcategory)
        return false
      return true
    })
  }, [inTab, activeTopic, activeSubcategory])

  function pickTab(v: Tab) {
    setTab(v)
    // Topic/subcategory are re-validated against the new tab's options via
    // activeTopic/activeSubcategory, but reset the raw state so the pills read
    // "All" after a tab switch rather than a stale highlighted-but-inactive pill.
    setTopic(ALL)
    setSubcategory(ALL)
  }

  function pickTopic(tp: BadgeTopic | typeof ALL) {
    setTopic(tp)
    setSubcategory(ALL) // sub-category is scoped to a Topic; reset on change
  }

  const filtering = activeTopic !== ALL || activeSubcategory !== ALL

  return (
    <div className="flex flex-col gap-lg">
      <Tabs
        items={[
          { value: 'all', label: t('tabAll'), count: links.length },
          { value: 'unsorted', label: t('tabUnsorted'), count: unsorted.length },
        ]}
        value={tab}
        onValueChange={(v) => pickTab(v as Tab)}
      />

      {/* Topic filter — only when the current tab has categorised saves. */}
      {topicOptions.length > 0 ? (
        <div className="flex flex-col gap-sm">
          <div
            role="group"
            aria-label={t('filterTopic')}
            className="flex flex-wrap items-center gap-xs"
          >
            <FilterPill
              active={activeTopic === ALL}
              onClick={() => pickTopic(ALL)}
              label={t('filterAll')}
            />
            {topicOptions.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => pickTopic(tp)}
                aria-pressed={activeTopic === tp}
                className={cn(
                  'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2',
                  activeTopic === tp
                    ? 'ring-2 ring-violet ring-offset-2'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                <Badge topic={tp} />
              </button>
            ))}
          </div>

          {/* Sub-category filter — only when a Topic that defines any is active. */}
          {subcategoryOptions.length > 0 ? (
            <div
              role="group"
              aria-label={t('filterSubcategory')}
              className="flex flex-wrap items-center gap-xs pl-md"
            >
              <FilterPill
                active={activeSubcategory === ALL}
                onClick={() => setSubcategory(ALL)}
                label={t('filterAll')}
              />
              {subcategoryOptions.map((label) => (
                <FilterPill
                  key={label}
                  active={activeSubcategory === label}
                  onClick={() => setSubcategory(label)}
                  label={label}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((link) => (
            <li key={link.id}>
              <SavedLinkRow link={link} unsortedLabel={t('unsortedBadge')} />
            </li>
          ))}
        </ul>
      ) : filtering ? (
        // A filter matched nothing in this tab — a neutral, honest empty state
        // (the underlying tab still has rows; the current filter just excludes
        // them all).
        <EmptyState
          tag={t('emptyFilterTag')}
          title={t('emptyFilterTitle')}
          body={t('emptyFilterBody')}
        />
      ) : tab === 'unsorted' ? (
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
 * A neutral text filter pill (the "All" option and sub-category labels, which
 * have no topic colour). Mirrors the Tabs pill styling so the two rows read as
 * one filter system.
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
