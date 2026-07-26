import { hasConsent } from '@/lib/consent/store'

/**
 * Analytics wrapper — the ONLY entry point the app uses to emit events.
 *
 * Opt-in strict (brief rule 2): every method gates on `analytics` consent via
 * the consent store. Until the user grants it (through Axeptio, chantier 7),
 * every call is a no-op — no PostHog SDK is even loaded, so no network request
 * and no cookie. This is deliberately a stub: the real PostHog init lives in
 * chantier 7, but the app codes against THIS interface starting now, so wiring
 * later is a swap behind the gate rather than a scatter of new call sites.
 *
 * Design note: keeping the gate here (not at each call site) means a future
 * dev cannot accidentally fire an event pre-consent — the wrapper refuses.
 */

type EventProps = Record<string, unknown>

function analyticsAllowed(): boolean {
  return hasConsent('analytics')
}

export const analytics = {
  /** Capture a product event. No-op unless analytics consent is granted. */
  capture(event: string, props?: EventProps): void {
    if (!analyticsAllowed()) return
    // chantier 7: posthog.capture(event, props)
    void event
    void props
  },

  /** Associate events with a user. No-op unless consent is granted. */
  identify(distinctId: string, props?: EventProps): void {
    if (!analyticsAllowed()) return
    // chantier 7: posthog.identify(distinctId, props)
    void distinctId
    void props
  },

  /** Clear identity on logout. Safe to call regardless of consent. */
  reset(): void {
    if (!analyticsAllowed()) return
    // chantier 7: posthog.reset()
  },
}
