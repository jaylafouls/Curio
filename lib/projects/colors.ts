/**
 * The 5-pastille colour palette for Projects (chantier 10).
 *
 * A Project's colour is one of five swatches, matching the user's universe
 * palette (data model §2 universe_color enum: violet/beige/vert/bleu/rose).
 * projects.color is free text in the DB, but the UI offers exactly these five
 * and the server action validates against them, so an arbitrary value can't be
 * injected. Each maps to a hex swatch via PROJECT_COLOR_HEX below (the same
 * values the onboarding universe picker uses).
 *
 * Kept in its own module (not the 'use server' actions file, which may only
 * export async functions) so both the client modal and the server action share
 * one source of truth.
 */
export const PROJECT_COLORS = [
  'violet',
  'beige',
  'vert',
  'bleu',
  'rose',
] as const

export type ProjectColor = (typeof PROJECT_COLORS)[number]

/**
 * Hex backing each swatch — the SAME 5 values the onboarding universe picker
 * uses (app/[locale]/onboarding/onboarding-wizard.tsx COLOR_HEX), reused here so
 * a project swatch and a universe swatch read identically. Stored verbatim as
 * projects.color, and rendered as the dot on a project card.
 */
export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  violet: '#785CFF',
  beige: '#D9C6A6',
  vert: '#6A7B7A',
  bleu: '#5B7088',
  rose: '#D9AFAE',
}
