'use client'

import { useEffect, useState } from 'react'
import { ConsentBanner } from './consent-banner'
import { logConsent } from '@/lib/consent/actions'
import { hasDecided, hydrateConsent, setConsent } from '@/lib/consent/store'
import { initAnalyticsConsentBridge } from '@/lib/analytics'
import type { ConsentState } from '@/lib/consent/types'

/**
 * ConsentProvider — the CMP mount point (brief part 1). Rendered once from the
 * root of every locale layout so the strict opt-in gate is always present.
 *
 * On mount it: (1) restores any prior decision from localStorage, (2) starts the
 * analytics↔consent bridge so PostHog boots/tears down live on consent change,
 * and (3) shows the banner only if no decision has been made yet.
 *
 * On a decision it writes the store (which drives the analytics wrapper and
 * persists the choice) AND records the consent_logs journal via the Server
 * Action — fire-and-forget so the UI dismisses immediately; a failed journal
 * write is logged server-side and does not block the user.
 *
 * This is where Axeptio's hosted widget would swap in later (decision D006):
 * replace <ConsentBanner> with the Axeptio SDK and drive `handleDecision` from
 * its callbacks — the rest (store, bridge, logging) is unchanged.
 */
export function ConsentProvider() {
  // Start hidden; reveal after mount so SSR/first paint never flashes the banner
  // before we've had a chance to restore a prior decision (avoids a CLS flash).
  const [show, setShow] = useState(false)

  useEffect(() => {
    hydrateConsent()
    initAnalyticsConsentBridge()
    setShow(!hasDecided())
  }, [])

  function handleDecision(state: ConsentState) {
    setConsent(state) // drives analytics wrapper + persists locally
    void logConsent(state) // RGPD journal (server action); non-blocking
    setShow(false)
  }

  if (!show) return null
  return <ConsentBanner onDecision={handleDecision} />
}
