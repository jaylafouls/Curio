import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireSupabaseEnv } from './env'
import { routing } from '@/lib/i18n/routing'

/**
 * Supabase session handling in middleware (brief §5).
 *
 * Two jobs, composed on top of the response next-intl already produced:
 *  1. Refresh the Supabase auth session cookie so Server Components always see a
 *     current session (the SSR pattern — the server client's setAll is a no-op
 *     in RSC, so the refresh must happen here).
 *  2. Protect connected routes: an unauthenticated request to a protected path
 *     is redirected to the Welcome screen (écran 01).
 *
 * The passed-in `response` is next-intl's output (it may carry a locale
 * redirect/rewrite). We attach the Supabase client to it so refreshed cookies
 * ride on whatever response ultimately goes back.
 */

// Path segments (after the locale prefix) that require an authenticated
// session. Everything else — Welcome, /signup, /explore, /auth/callback — is
// public. Kept as a prefix list so nested routes inherit protection.
const PROTECTED_SEGMENTS = ['home', 'onboarding'] as const

function isProtectedPath(pathname: string): boolean {
  // pathname looks like /en/home or /fr/onboarding/step. Strip the locale.
  const segments = pathname.split('/').filter(Boolean)
  const [maybeLocale, first] = segments
  const afterLocale = (routing.locales as readonly string[]).includes(maybeLocale)
    ? first
    : maybeLocale
  return PROTECTED_SEGMENTS.includes(afterLocale as (typeof PROTECTED_SEGMENTS)[number])
}

function localeFromPath(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0]
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale
}

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const { url, anonKey } = requireSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: {
          name: string
          value: string
          options?: Record<string, unknown>
        }[],
      ) {
        // Write refreshed cookies onto both the request (so a downstream read in
        // this same pass sees them) and the outgoing response.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // getUser() revalidates the token with the auth server and triggers the
  // cookie refresh via setAll above. Do not gate any logic on getSession() in
  // middleware — getUser is the authenticated check.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const locale = localeFromPath(request.nextUrl.pathname)
    const redirectUrl = new URL(`/${locale}`, request.url)
    // Preserve refreshed cookies on the redirect response too.
    const redirect = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return response
}
