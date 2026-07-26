'use client'

import { useSyncExternalStore } from 'react'
import { getConsent, subscribeConsent } from './store'
import type { ConsentState } from './types'

/**
 * React hook exposing the current consent state to Client Components.
 * Backed by the framework-free store so server code and the analytics wrapper
 * can share the same source of truth. Wired to Axeptio in chantier 7.
 */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, getConsent, getConsent)
}
