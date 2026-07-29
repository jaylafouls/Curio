'use client'

import { useEffect } from 'react'
import { identifyUser } from '@/lib/analytics'
import { subscribeConsent, hasConsent } from '@/lib/consent/store'
import type { UserProperties } from '@/lib/analytics/events'

/**
 * Sets PostHog person properties for the authenticated user (spec §15.3).
 *
 * Server Components pass the assembled distinctId + props (from
 * buildUserProperties); this client component calls identifyUser — which no-ops
 * until analytics consent + the SDK are ready. It also re-fires when consent
 * flips ON later, so granting analytics after page load still identifies the
 * user without a reload. Renders nothing.
 */
export function AnalyticsIdentify({
  distinctId,
  props,
}: {
  distinctId: string
  props: UserProperties
}) {
  useEffect(() => {
    // Try now (no-op if consent not yet granted), then again whenever consent
    // changes to a granted state.
    identifyUser(distinctId, props)
    return subscribeConsent(() => {
      if (hasConsent('analytics')) identifyUser(distinctId, props)
    })
  }, [distinctId, props])

  return null
}
