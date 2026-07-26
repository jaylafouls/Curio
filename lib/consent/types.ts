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
