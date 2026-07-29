import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getConsent,
  hasConsent,
  setConsent,
  subscribeConsent,
  hasDecided,
} from './store'
import { DEFAULT_CONSENT } from './types'

/**
 * Consent store tests (chantier 7 part 3) — the RGPD-critical invariant is that
 * NOTHING but `necessary` is granted until an explicit decision, and that a
 * decision always keeps `necessary` on. These guard the strict opt-in gate the
 * analytics wrapper depends on.
 *
 * Node env (no DOM): the store guards its localStorage writes on `typeof
 * window`, so setConsent works headless — persistence is simply skipped.
 */

// Reset to the strict default before each test (module state is a singleton).
beforeEach(() => {
  setConsent({ analytics: false, marketing: false })
})

describe('default state', () => {
  it('grants only necessary by construction', () => {
    expect(DEFAULT_CONSENT).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  })

  it('reports no analytics/marketing consent by default', () => {
    setConsent({ analytics: false, marketing: false })
    expect(hasConsent('necessary')).toBe(true)
    expect(hasConsent('analytics')).toBe(false)
    expect(hasConsent('marketing')).toBe(false)
  })
})

describe('setConsent', () => {
  it('flips a category on and reflects it in hasConsent', () => {
    setConsent({ analytics: true })
    expect(hasConsent('analytics')).toBe(true)
    expect(getConsent().analytics).toBe(true)
  })

  it('always forces necessary true even if asked to disable it', () => {
    // A caller cannot revoke necessary — it is structurally pinned on.
    setConsent({ necessary: false } as Partial<typeof DEFAULT_CONSENT>)
    expect(hasConsent('necessary')).toBe(true)
  })

  it('marks the visitor as decided', () => {
    setConsent({ analytics: true, marketing: false })
    expect(hasDecided()).toBe(true)
  })

  it('notifies subscribers on change', () => {
    const listener = vi.fn()
    const unsub = subscribeConsent(listener)
    setConsent({ analytics: true })
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ analytics: true, necessary: true }),
    )
    unsub()
    listener.mockClear()
    setConsent({ analytics: false })
    expect(listener).not.toHaveBeenCalled()
  })
})
