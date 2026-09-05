'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, CuratorCard, Button } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { PublicCurator, PublicTopic } from '@/lib/public/data'

/**
 * CuratorsGrid — the interactive grid used on /curators once curators exist. It
 * owns the topic filter (spec §8.4: filters by Topics; Expertise/Top Locations
 * are deferred until curator profiles carry those fields). Rendered only when
 * there is at least one curator; the empty case is handled on the server page
 * with the designed coming-soon state, so this stays purely a data view.
 *
 * Curators today have no topic/expertise on their profile row, so the topic
 * filter shows "All" plus the core topics and passes everything through until a
 * later chantier attaches a primary topic to a curator — the control is present
 * (mockup fidelity) and activates without a rewrite.
 */
export function CuratorsGrid({
  curators,
  topics,
}: {
  curators: PublicCurator[]
  topics: PublicTopic[]
}) {
  const t = useTranslations('Curators')
  const [topic, setTopic] = useState('all')

  const tabs = useMemo(
    () => [
      { value: 'all', label: t('filterAll') },
      ...topics.map((tp) => ({ value: tp.id, label: tp.label })),
    ],
    [topics, t],
  )

  return (
    <div className="flex flex-col gap-xl">
      <div className="overflow-x-auto">
        <Tabs items={tabs} value={topic} onValueChange={setTopic} variant="pill" />
      </div>

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {curators.map((c) => (
          <CuratorCard
            key={c.id}
            compact
            name={c.displayName}
            // Neutral brand tint for the "Curator" role badge — curators carry
            // no primary Topic yet, so this is a role colour, not a category
            // claim (recette P2-3).
            topic="ideas"
            role={t('role')}
            bio={c.bio ?? ''}
            followers={c.followersCount}
            avatar={c.avatarUrl ?? undefined}
            action={
              <Link href={`/profile/${c.username}`}>
                <Button variant="secondary" size="small">
                  {t('viewProfile')}
                </Button>
              </Link>
            }
          />
        ))}
      </div>
    </div>
  )
}
