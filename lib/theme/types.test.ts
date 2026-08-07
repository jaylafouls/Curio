import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  modeToPreference,
  preferenceToMode,
  THEME_PREFERENCES,
  type ThemePreference,
} from './types'

/**
 * The DB and the toggle speak different vocabularies ('light'|'dark' vs
 * 'archive'|'cosmic'). A silent inversion here would persist the wrong mode
 * while still compiling, so the mapping is pinned in both directions.
 */
describe('theme preference vocabulary mapping', () => {
  it('maps DB preference → toggle mode (dark = cosmic, light = archive)', () => {
    expect(preferenceToMode('dark')).toBe('cosmic')
    expect(preferenceToMode('light')).toBe('archive')
  })

  it('maps toggle mode → DB preference (cosmic = dark, archive = light)', () => {
    expect(modeToPreference('cosmic')).toBe('dark')
    expect(modeToPreference('archive')).toBe('light')
  })

  it('round-trips every DB preference losslessly', () => {
    for (const pref of THEME_PREFERENCES) {
      expect(modeToPreference(preferenceToMode(pref))).toBe(pref)
    }
  })

  it('defaults to the DB default (light), matching migration 0002', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('light')
  })
})

describe('isThemePreference', () => {
  it('accepts only the two CHECK-constraint values', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
  })

  it('rejects toggle vocabulary and junk (guarding the DB write)', () => {
    const rejects: unknown[] = [
      'cosmic',
      'archive',
      'Dark',
      '',
      null,
      undefined,
      0,
      {},
    ]
    for (const value of rejects) {
      expect(isThemePreference(value)).toBe(false)
    }
  })

  it('narrows the type when it returns true', () => {
    const value: unknown = 'dark'
    if (isThemePreference(value)) {
      const pref: ThemePreference = value
      expect(pref).toBe('dark')
    }
  })
})
