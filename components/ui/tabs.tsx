'use client'

import { cn } from '@/lib/ui/cn'

/**
 * Tabs — controlled, two styles from the mockups:
 *  - underline (default): text tabs with an active violet underline and an
 *    optional count ("Links 48 · About · Notes 3" on the Project page).
 *  - pill: rounded active chip ("All · Travel · Style" category filters on Home).
 *
 * Controlled (value / onValueChange) so it stays presentational — the consumer
 * owns which tab is active. Implemented as a proper tablist for a11y.
 */
export type TabsVariant = 'underline' | 'pill'

export interface TabItem {
  value: string
  label: string
  count?: number
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  variant?: TabsVariant
  className?: string
}

export function Tabs({
  items,
  value,
  onValueChange,
  variant = 'underline',
  className,
}: TabsProps) {
  const isPill = variant === 'pill'

  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center',
        isPill ? 'gap-sm flex-wrap' : 'gap-lg border-b border-border-light',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'font-sans text-body-small transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
              isPill
                ? cn(
                    'rounded-full px-md py-xs',
                    active
                      ? 'bg-violet text-button-text-on-dark'
                      : 'border border-border-light text-foreground/70 hover:bg-foreground/5',
                  )
                : cn(
                    '-mb-px flex items-center gap-xs border-b-2 pb-sm',
                    active
                      ? 'border-violet text-foreground'
                      : 'border-transparent text-foreground/60 hover:text-foreground',
                  ),
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  'font-sans text-meta',
                  active ? 'text-inherit' : 'text-foreground/40',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
