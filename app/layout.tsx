import type { ReactNode } from 'react'
import './globals.css'

/**
 * Passthrough root. With next-intl `localePrefix: 'always'`, every real page
 * lives under app/[locale], and that segment owns <html>/<body> so `lang`
 * matches the URL locale. Next requires a root layout to exist; this one only
 * forwards children. Global CSS is imported here so it applies app-wide.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
