'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import { SavedLinkRow } from './saved-link-row'
import type { SavedLink } from '@/lib/app/data'

/**
 * SavedLinksClient — the tabbed body of /saved (§8.9 "Unsorted + all links").
 * The page fetches every saved link once (server-side, under owner RLS); this
 * client component owns only the All / Unsorted filter so switching tabs is a
 * no-round-trip toggle. "Unsorted" = collection_id IS NULL (data model §9).
 *
 * Empty states are per-tab: a fresh account sees "your saved links will appear
 * here"; a fully-filed account sees "nothing unsorted" on that tab only — never
 * fake rows.
 */
type Tab = 'all' | 'unsorted'

export function SavedLinksClient({ links }: { links: SavedLink[] }) {
  const t = useTranslations('Saved')
  const [tab, setTab] = useState<Tab>('all')

  const unsorted = links.filter((l) => l.collectionId === null)
  const visible = tab === 'unsorted' ? unsorted : links

  return (
    <div className="flex flex-col gap-lg">
      <Tabs
        items={[
          { value: 'all', label: t('tabAll'), count: links.length },
          { value: 'unsorted', label: t('tabUnsorted'), count: unsorted.length },
        ]}
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
      />

      {visible.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border-light">
          {visible.map((link) => (
            <li key={link.id}>
              <SavedLinkRow link={link} unsortedLabel={t('unsortedBadge')} />
            </li>
          ))}
        </ul>
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
