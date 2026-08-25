import { Inter, DM_Serif_Display } from 'next/font/google'

/**
 * Fonts via next/font/google (brief rule 1 + Design Tokens §2.1).
 * Self-optimised, font-display: swap, zero layout shift, no external request
 * at runtime. Exposed as CSS variables consumed by tailwind.config.ts.
 *
 * DM Serif Display: weight 400 ONLY (+ italic) — display font, single weight,
 * same as the Instrument Serif it replaces (2026-08 typography update).
 * Hierarchy is size-driven, never weight-driven, for this family (§2.1).
 */
export const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif-display',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
