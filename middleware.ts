import createMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from './lib/i18n/routing'
import { updateSession } from './lib/supabase/middleware'

// next-intl handles locale negotiation + prefix redirects. We run it first so
// its response (redirect/rewrite + locale cookie) is authoritative, then layer
// Supabase session refresh + protected-route redirect on top (Auth chantier §5).
const handleI18nRouting = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request)
  return updateSession(request, response)
}

export const config = {
  // Run on everything except Next internals, API routes, and files with an
  // extension (assets). Ensures public pages always get a locale prefix and
  // connected pages get a fresh session + protection.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
