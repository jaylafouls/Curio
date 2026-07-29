/**
 * Event catalog (spec §15.2) — typed signatures for every product analytics
 * event, so call sites are checked and the property shape is one source of
 * truth. Emitting always goes through `trackEvent` (lib/analytics/index.ts),
 * which is a strict opt-in gate: nothing here can fire before analytics consent.
 *
 * Only ONE event has a real trigger point in the codebase today:
 *   • onboarding_step_completed — wired in the onboarding wizard (chantier 5).
 *
 * Every other event is SCAFFOLDED, not wired: its trigger feature (save,
 * collections, search, follow…) does not exist yet. The signature exists now so
 * the future chantier that builds the feature calls `trackEvent('name', props)`
 * with a compiler-checked payload rather than inventing an ad-hoc shape. We do
 * NOT build any placeholder UI to fire these — that would fabricate signal.
 */

/** The onboarding funnel steps that can complete (matches the wizard's STEPS). */
export type OnboardingStep =
  | 'interests'
  | 'curators'
  | 'universe'
  | 'ready'
  | 'allSet'

/**
 * Payload map: event name → its typed properties. `trackEvent` is generic over
 * this map, so `trackEvent('search_query', { … })` only accepts the right shape.
 * `Record<string, never>` marks a genuinely property-less event.
 */
export interface AnalyticsEventMap {
  // ── Wired today (chantier 5 onboarding wizard) ──────────────────────────
  /** Fired at each onboarding step transition. duration is ms on that step. */
  onboarding_step_completed: { step: OnboardingStep; duration: number }

  // ── Scaffolded: triggers land with their feature (spec §15.2) ───────────
  /** A link saved to the user's space. */
  link_saved: { link_id: string; collection_id: string | null }
  /** An outbound click on a saved link. */
  link_clicked: { link_id: string; collection_id: string | null }
  /** The current user followed a public collection. */
  collection_followed: { collection_id: string }
  /** The current user followed a curator. */
  curator_followed: { curator_id: string }
  /** A search was submitted. query is the raw term; result_count the hits. */
  search_query: { query: string; result_count: number }
  /** A topic was (de)selected outside the onboarding funnel. */
  topic_selected: { topic_id: string; selected: boolean }
  /** Lifecycle: the user's very first save (funnel activation milestone). */
  first_save: { link_id: string }
  /** Lifecycle: the user's first created collection. */
  first_collection_created: { collection_id: string }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

/**
 * PostHog person properties we set on identify (spec §15.3). Only the four with
 * a real source today carry values; `plan` and `location` have no feature yet,
 * so their keys exist in the type but are always left undefined — we never
 * fabricate a value (project non-negotiable: no factice data).
 */
export interface UserProperties {
  /** Slugs of topics the user selected (from user_topics). */
  topics: string[]
  /** UI language, from the next-intl locale ('en' | 'fr'). */
  language: string
  /** 'curator' when is_founding_curator, else 'discoverer'. */
  type: 'curator' | 'discoverer'
  /** users.created_at (ISO). */
  signup_date: string
  /** No plan feature exists yet — always undefined for now. */
  plan?: undefined
  /** No geo feature exists yet — always undefined for now. */
  location?: undefined
}
