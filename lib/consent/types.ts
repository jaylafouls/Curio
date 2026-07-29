/**
 * Consent model (brief rule 3, RGPD). Axeptio is the CMP; the real wiring
 * lands in chantier 7. This file fixes the contract now so analytics/consent
 * code written before then is already opt-in by construction.
 *
 * Categories mirror Axeptio's standard buckets. `necessary` is always granted
 * (strictly essential cookies only — session/auth). Everything else defaults
 * to DENIED until the user actively opts in.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

/**
 * Version of the Privacy Policy in force, stamped on every consent_logs row
 * (RGPD: each consent record must reference the policy it was given against).
 *
 * Date form (ISO) is monotonic and human-readable — bump it the day the real
 * Privacy Policy legal text is published. The legal text itself is a content
 * task outside dev scope: it is a LAUNCH BLOCKER (a live product cannot collect
 * consent against a policy the user cannot read) but NOT a blocker for wiring
 * the consent machinery. Decision D007.
 */
export const CONSENT_POLICY_VERSION = '2026-07-29'

export type ConsentState = Record<ConsentCategory, boolean>

/**
 * Strict opt-in default: only `necessary` is true. No analytics or marketing
 * signal fires until the CMP reports an explicit grant.
 */
export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
}

export type ConsentChangeListener = (state: ConsentState) => void
