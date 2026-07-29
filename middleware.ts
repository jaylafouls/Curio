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
  // Run on everything except Next internals, API routes, files with an extension
  // (assets), and the root SEO file-convention routes. The SEO routes
  // (opengraph-image, robots.txt, sitemap.xml) live at the app root, NOT under
  // [locale]; letting next-intl locale-redirect them (e.g. /opengraph-image →
  // /en/opengraph-image) would 404 the og:image and break crawler access to
  // robots/sitemap. Everything else still gets a locale prefix + session refresh.
  matcher: [
    '/((?!api|_next|_vercel|opengraph-image|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
}
