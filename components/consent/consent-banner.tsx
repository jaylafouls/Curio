'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import type { ConsentState } from '@/lib/consent/types'

/**
 * ConsentBanner — the first-party CMP surface (decision D006). Two views:
 *   • summary: intro + Accept all / Reject all / Customise
 *   • detail:  per-category toggles (necessary locked on) + Save my choices
 *
 * Presentational only: it never touches the store or the network. It reports the
 * chosen ConsentState up via `onDecision`; the provider persists + logs it. This
 * keeps the strict-opt-in guarantee in one place (the provider/wrapper) and lets
 * the banner be a pure, testable view.
 *
 * EN/FR via next-intl. Rendered on the Cosmic (dark) surface so it reads on-brand
 * over any page; a11y: labelled dialog, focusable controls, switch semantics.
 */
export function ConsentBanner({
  onDecision,
}: {
  onDecision: (state: ConsentState) => void
}) {
  const t = useTranslations('Consent')
  const [detail, setDetail] = useState(false)
  // Draft toggles for the detail view; necessary is always on and locked.
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  const acceptAll = () =>
    onDecision({ necessary: true, analytics: true, marketing: true })
  const rejectAll = () =>
    onDecision({ necessary: true, analytics: false, marketing: false })
  const saveChoices = () =>
    onDecision({ necessary: true, analytics, marketing })

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('title')}
      className="dark fixed inset-x-0 bottom-0 z-50 border-t border-border bg-cosmic/95 backdrop-blur supports-[backdrop-filter]:bg-cosmic/80"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-md p-lg">
        <div className="flex flex-col gap-xs">
          <h2 className="font-serif text-h3 leading-tight text-foreground">
            {t('title')}
          </h2>
          <p className="font-sans text-body-small text-foreground/70">
            {t('body')}
          </p>
        </div>

        {detail ? (
          <ul className="flex flex-col gap-sm">
            <CategoryRow
              label={t('necessaryLabel')}
              desc={t('necessaryDesc')}
              locked
              checked
              lockedLabel={t('necessaryAlways')}
            />
            <CategoryRow
              label={t('analyticsLabel')}
              desc={t('analyticsDesc')}
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              label={t('marketingLabel')}
              desc={t('marketingDesc')}
              checked={marketing}
              onChange={setMarketing}
            />
          </ul>
        ) : null}

        <div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
          {detail ? (
            <>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setDetail(false)}
              >
                {t('back')}
              </Button>
              <Button variant="primary" size="small" onClick={saveChoices}>
                {t('save')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setDetail(true)}
              >
                {t('customize')}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={rejectAll}
              >
                {t('rejectAll')}
              </Button>
              <Button variant="primary" size="small" onClick={acceptAll}>
                {t('acceptAll')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** One consent category: label + description + a switch (or a locked pill). */
function CategoryRow({
  label,
  desc,
  checked,
  onChange,
  locked = false,
  lockedLabel,
}: {
  label: string
  desc: string
  checked: boolean
  onChange?: (next: boolean) => void
  locked?: boolean
  lockedLabel?: string
}) {
  return (
    <li className="flex items-start justify-between gap-md rounded-lg border border-border bg-foreground/[0.03] p-md">
      <div className="flex min-w-0 flex-col gap-xs">
        <span className="font-sans text-body-small font-medium text-foreground">
          {label}
        </span>
        <span className="font-sans text-meta text-foreground/60">{desc}</span>
      </div>
      {locked ? (
        <span className="shrink-0 rounded-full bg-foreground/10 px-sm py-xs font-sans text-meta text-foreground/60">
          {lockedLabel}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange?.(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic',
            checked ? 'bg-violet' : 'bg-foreground/20',
          )}
        >
          <span
            className={cn(
              'inline-block size-5 rounded-full bg-white transition-transform duration-base',
              checked ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      )}
    </li>
  )
}
