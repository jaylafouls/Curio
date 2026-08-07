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
 * Hex backing each swatch — the single source of truth for the 5-swatch palette.
 * The onboarding universe picker imports this map (COLOR_HEX in
 * app/[locale]/onboarding/onboarding-wizard.tsx) rather than redefining it, so a
 * project swatch and a universe swatch can never drift apart (design-token
 * audit, Phase 5). Stored verbatim as projects.color, rendered as the dot on a
 * project card.
 *
 * These hexes mirror tokens in tailwind.config.ts (violet/beige/olive + two
 * badge hues); if a token value changes (e.g. olive is reconfirmed by the
 * designer, Design Tokens §1.3), update it here too — this map is plain hex
 * because projects.color is persisted as text, not a Tailwind class.
 */
export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  violet: '#785CFF',
  beige: '#D9C6A6',
  vert: '#6A7B7A',
  bleu: '#5B7088',
  rose: '#D9AFAE',
}
