import {
  DEFAULT_CONSENT,
  type ConsentCategory,
  type ConsentChangeListener,
  type ConsentState,
} from './types'

/**
 * In-memory consent store — the single source of truth other modules read
 * (analytics gates on it). It starts strictly opt-in (only `necessary`).
 *
 * The CMP (first-party banner, decision D006) calls `setConsent()` with the
 * user's choices; the analytics wrapper subscribes and reacts live. Kept
 * framework-free so both the wrapper and React hooks can consume it.
 *
 * Persistence: the resolved decision is mirrored to localStorage so a returning
 * visitor's choice is restored on next load (and the banner does not re-prompt).
 * Only the decision is stored — nothing is captured until analytics consent is
 * granted, so the store itself sets no tracking cookie.
 */

const STORAGE_KEY = 'curio.consent.v1'

let state: ConsentState = { ...DEFAULT_CONSENT }
let decided = false
const listeners = new Set<ConsentChangeListener>()

/**
 * Restore a previously saved decision from localStorage. Call once on the
 * client at CMP mount, BEFORE deciding whether to show the banner. No-op on the
 * server or when nothing was saved. Malformed storage is ignored (treated as
 * "no decision yet") so a corrupt value can never grant consent by accident.
 */
export function hydrateConsent(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as Partial<ConsentState>
    state = {
      necessary: true,
      analytics: saved.analytics === true,
      marketing: saved.marketing === true,
    }
    decided = true
    for (const listener of listeners) listener(state)
  } catch {
    // Corrupt value → stay at the strict default, banner will re-prompt.
  }
}

/** Whether the visitor has made an explicit consent decision this/previous visit. */
export function hasDecided(): boolean {
  return decided
}

export function getConsent(): ConsentState {
  return state
}

export function hasConsent(category: ConsentCategory): boolean {
  return state[category] === true
}

/**
 * Record the visitor's decision. Called by the CMP on accept/reject/per-category
 * change. Always forces `necessary` true, marks the visitor as decided, persists
 * the choice, and notifies subscribers (the analytics wrapper reacts live).
 */
export function setConsent(next: Partial<ConsentState>): void {
  state = { ...state, ...next, necessary: true }
  decided = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable (private mode / quota) — the in-memory decision
      // still holds for this session; we just can't remember it next visit.
    }
  }
  for (const listener of listeners) listener(state)
}

/** Subscribe to consent changes; returns an unsubscribe fn. */
export function subscribeConsent(listener: ConsentChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
