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
 * In chantier 7 the Axeptio callback calls `setConsent()` with the user's
 * choices; until then the state never leaves its DENIED default, so no
 * non-essential signal can fire. Kept framework-free so both the analytics
 * wrapper and React hooks can consume it.
 */
let state: ConsentState = { ...DEFAULT_CONSENT }
const listeners = new Set<ConsentChangeListener>()

export function getConsent(): ConsentState {
  return state
}

export function hasConsent(category: ConsentCategory): boolean {
  return state[category] === true
}

/** Called by the CMP integration (Axeptio) once the user has chosen. */
export function setConsent(next: Partial<ConsentState>): void {
  state = { ...state, ...next, necessary: true }
  for (const listener of listeners) listener(state)
}

/** Subscribe to consent changes; returns an unsubscribe fn. */
export function subscribeConsent(listener: ConsentChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
