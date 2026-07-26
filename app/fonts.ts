import { Inter, Instrument_Serif } from 'next/font/google'

/**
 * Fonts via next/font/google (brief rule 1 + Design Tokens §2.1).
 * Self-optimised, font-display: swap, zero layout shift, no external request
 * at runtime. Exposed as CSS variables consumed by tailwind.config.ts.
 *
 * Instrument Serif: weight 400 ONLY (+ italic) — display font, single weight.
 * Hierarchy is size-driven, never weight-driven, for this family (§2.1).
 */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
