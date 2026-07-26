/**
 * PostHog Cloud EU configuration (brief rule 2, RGPD).
 *
 * Host is pinned to the EU cloud (eu.i.posthog.com) — data must not leave the
 * EU. The real init + event wiring happens in chantier 7; this file only holds
 * config so nothing is hardcoded later.
 */
export const POSTHOG_HOST = 'https://eu.i.posthog.com'

export function getPosthogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(getPosthogKey())
}
