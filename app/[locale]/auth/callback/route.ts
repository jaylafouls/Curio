import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupportedLocale, routing } from '@/lib/i18n/routing'

/**
 * Auth callback (brief §3/§4). The single return point for every auth method:
 *  - Magic link (signInWithOtp) and OAuth (Google/Apple) both redirect here
 *    with a `code` to exchange for a session (PKCE).
 *  - If a valid invitation `token` rode along, redeem it in ONE transaction via
 *    the redeem_invitation_token RPC (founding-curator promotion, §4).
 *  - Then read users.onboarding_completed and route:
 *      false → /onboarding (funnel steps, chantier 5 — stub for now)
 *      true  → /home       (personalised feed, Phase 3 — stub for now)
 *
 * On an invalid/expired code, redirect to /signup?error=auth rather than crash.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params
  const locale = isSupportedLocale(rawLocale) ? rawLocale : routing.defaultLocale

  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const token = searchParams.get('token') ?? undefined

  const withLocale = (path: string) => `${origin}/${locale}${path}`

  if (!code) {
    return NextResponse.redirect(withLocale('/signup?error=auth'))
  }

  const supabase = await createClient()
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !sessionData.user) {
    return NextResponse.redirect(withLocale('/signup?error=auth'))
  }

  const userId = sessionData.user.id

  // Redeem an invitation token if one was carried through. The RPC is
  // SECURITY DEFINER and validates the token internally; a false return (absent/
  // used/expired) is fine — the user keeps the normal Découvreur path (§4).
  if (token) {
    const { error: redeemError } = await supabase.rpc('redeem_invitation_token', {
      p_token: token,
      p_user: userId,
    })
    // A redeem failure must not block sign-in; the user still gets in, just
    // without the founding-curator badge. Surfaced in server logs for audit.
    if (redeemError) {
      console.error('redeem_invitation_token failed', {
        userId,
        message: redeemError.message,
      })
    }
  }

  // Route by onboarding state. The provisioning trigger guarantees a users row
  // exists, so this select always resolves for an authenticated user.
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('failed to read onboarding state', {
      userId,
      message: profileError.message,
    })
  }

  const destination = profile?.onboarding_completed ? '/home' : '/onboarding'
  return NextResponse.redirect(withLocale(destination))
}
