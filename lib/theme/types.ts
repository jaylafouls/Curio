import type { ThemeMode } from '@/components/ui/theme-toggle'

/**
 * Theme preference — the two connected-app UI modes (Design Tokens §8).
 *
 * TWO vocabularies exist and must not be confused:
 *  - The DB (`users.theme_preference`, migration 0002) stores `'light' | 'dark'`
 *    with a CHECK constraint — that is the persisted, canonical value.
 *  - The UI toggle (components/ui/theme-toggle.tsx) speaks `'archive' | 'cosmic'`
 *    (Archive = light default, Cosmic = dark), matching the design-token names.
 *
 * `THEME_PREFERENCES` mirrors the DB CHECK so a value can be validated before a
 * write; the two mapping helpers translate at the boundary so the DB layer never
 * leaks toggle vocabulary and the toggle never leaks DB vocabulary.
 */
export const THEME_PREFERENCES = ['light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** DB default (`theme_preference text not null default 'light'`). */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark'
}

/** DB value → toggle vocabulary. `'dark'` ↔ Cosmic, `'light'` ↔ Archive. */
export function preferenceToMode(pref: ThemePreference): ThemeMode {
  return pref === 'dark' ? 'cosmic' : 'archive'
}

/** Toggle vocabulary → DB value (what we persist). */
export function modeToPreference(mode: ThemeMode): ThemePreference {
  return mode === 'cosmic' ? 'dark' : 'light'
}
