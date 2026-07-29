import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupportedLocale, routing } from '@/lib/i18n/routing'

/**
 * Sign-out (spec §7.2 "Log out"). A POST from the app sidebar / bottom nav:
 * clears the Supabase session (which also clears the auth cookies via the server
 * client's setAll), then redirects to the locale's Welcome screen (écran 01).
 *
 * POST, not GET, so it can't be triggered by a prefetch or a crawler following a
 * link — a sign-out must be an explicit user action.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params
  const locale = isSupportedLocale(rawLocale) ? rawLocale : routing.defaultLocale

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('sign-out failed', { message: error.message })
  }

  return NextResponse.redirect(new URL(`/${locale}`, request.url), {
    // 303 so the browser follows with GET after the POST.
    status: 303,
  })
}
