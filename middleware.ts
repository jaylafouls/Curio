import createMiddleware from 'next-intl/middleware'
import { routing } from './lib/i18n/routing'

// Locale negotiation + redirect to a prefixed URL. Keeps /en and /fr canonical.
export default createMiddleware(routing)

export const config = {
  // Run on everything except Next internals, API routes, and files with an
  // extension (assets). Ensures public pages always get a locale prefix.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
