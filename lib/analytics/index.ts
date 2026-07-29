import { getConsent, hasConsent, subscribeConsent } from '@/lib/consent/store'
import { POSTHOG_HOST, getPosthogKey } from './config'
import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  UserProperties,
} from './events'
import type { PostHog } from 'posthog-js'

/**
 * Analytics wrapper — the ONLY entry point the app uses to emit events, and a
 * STRUCTURAL opt-in-strict gate (spec §15.2, brief rule 3).
 *
 * Guarantees, enforced here so no call site can bypass them:
 *   • No PostHog code loads and no cookie/network request happens until the
 *     user grants `analytics` consent. The SDK is dynamically imported the
 *     first time consent flips on — never before.
 *   • On consent change the wrapper reacts live (no page reload): granting
 *     boots/opts-in PostHog; revoking opts out and clears any identity.
 *   • Every emit re-checks consent at call time, so even a queued/late call
 *     no-ops if consent was withdrawn in between.
 *
 * A developer who forgets to check consent still cannot leak an event: the gate
 * is the wrapper itself, not a convention at the call site.
 */

let posthog: PostHog | null = null
let loading: Promise<PostHog | null> | null = null
let subscribed = false

/** True only when the SDK is loaded AND analytics consent currently holds. */
function ready(): boolean {
  return posthog !== null && hasConsent('analytics')
}

/**
 * Lazily import + init posthog-js. Runs at most once; subsequent grants reuse
 * the same instance (opting it back in). No-op on the server or without a key.
 */
async function ensurePostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null
  const key = getPosthogKey()
  if (!key) return null // analytics not configured — stays fully inert
  if (posthog) return posthog
  if (loading) return loading

  loading = import('posthog-js').then(({ default: ph }) => {
    ph.init(key, {
      api_host: POSTHOG_HOST,
      // Opt-in strict: PostHog captures nothing until we explicitly opt in.
      // Belt-and-braces with our own gate — even if this module is misused,
      // PostHog itself will not autocapture or set cookies pre-opt-in.
      opt_out_capturing_by_default: true,
      autocapture: false,
      capture_pageview: false,
      persistence: 'localStorage+cookie',
    })
    posthog = ph
    return ph
  })
  return loading
}

/** Apply the current consent state to PostHog (boot+opt-in, or opt-out+reset). */
async function syncFromConsent(): Promise<void> {
  if (hasConsent('analytics')) {
    const ph = await ensurePostHog()
    ph?.opt_in_capturing()
  } else if (posthog) {
    // Consent withdrawn: stop capturing and drop identity so no further signal
    // (and no persisted distinct_id) survives the revocation.
    posthog.opt_out_capturing()
    posthog.reset()
  }
}

/**
 * Start reacting to consent changes. Called once when the CMP provider mounts
 * (client-side). Idempotent. Also applies the initial state immediately in case
 * consent was already granted (e.g. a returning visitor whose choice was
 * restored before this ran).
 */
export function initAnalyticsConsentBridge(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!subscribed) {
    subscribed = true
    subscribeConsent(() => {
      void syncFromConsent()
    })
    // Apply whatever consent already holds at mount.
    if (getConsent().analytics) void syncFromConsent()
  }
  return () => {}
}

type Props<E extends AnalyticsEventName> = AnalyticsEventMap[E]

/**
 * Emit a product event. Type-safe against the catalog (lib/analytics/events.ts):
 * the props must match the event's declared shape. No-op unless analytics
 * consent is granted AND the SDK is loaded.
 *
 * Events with no properties are called as `trackEvent('name')`.
 */
export function trackEvent<E extends AnalyticsEventName>(
  ...args: keyof Props<E> extends never
    ? [event: E, props?: Props<E>]
    : [event: E, props: Props<E>]
): void {
  const [event, props] = args
  if (!ready()) return
  posthog!.capture(event, props as Record<string, unknown> | undefined)
}

/**
 * Set person properties (spec §15.3). No-op unless consent + SDK are ready.
 * Undefined-valued keys (plan/location today) are dropped so we never write a
 * fabricated or empty property.
 */
export function identifyUser(distinctId: string, props: UserProperties): void {
  if (!ready()) return
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) clean[k] = v
  }
  posthog!.identify(distinctId, clean)
}

/** Clear identity (e.g. on logout). Safe to call regardless of consent. */
export function resetAnalytics(): void {
  posthog?.reset()
}
