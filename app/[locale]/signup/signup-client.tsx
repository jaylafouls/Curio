'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Apple, Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/lib/i18n/navigation'
import { AccentText, Input } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Écran 02 — Sign up / Log in (brief §2/§3). One screen, inline toggle between
 * "sign up" and "log in" (same providers, adapted copy). Magic-link email flow
 * (signInWithOtp); Apple/Google via signInWithOAuth.
 *
 * The invitation token (if a valid one rode in from Welcome) is carried in the
 * OAuth/magic-link redirect so the callback can redeem it after auth.
 */

type Mode = 'signup' | 'login'
type EmailStage = 'idle' | 'sending' | 'sent' | 'error'

/** Google "G" as an inline SVG (lucide has no brand marks). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.85 9.9c.86-2.6 3.29-4.53 6.15-4.53Z"
      />
    </svg>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignUpClient({
  locale,
  token,
}: {
  locale: Locale
  token?: string
}) {
  const t = useTranslations('SignUp')
  const [mode, setMode] = useState<Mode>('signup')
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<EmailStage>('idle')
  const [oauthError, setOauthError] = useState<string | null>(null)

  // The callback URL the provider / magic link returns to. Absolute origin is
  // required by Supabase; the token (if any) is preserved for redemption.
  function callbackUrl() {
    const base = `${window.location.origin}/${locale}/auth/callback`
    return token ? `${base}?token=${encodeURIComponent(token)}` : base
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    })
    // On success the browser is redirected away; only errors return here.
    // A provider that isn't configured yet (external OAuth setup pending, see
    // brief NOTE) surfaces as a clear, non-crashing message.
    if (error) setOauthError(t('providerUnavailable'))
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      setStage('error')
      return
    }
    setStage('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    })
    setStage(error ? 'error' : 'sent')
  }

  const subtitle = mode === 'signup' ? t('subtitle') : t('loginSubtitle')

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col justify-center gap-2xl py-3xl">
      <header className="flex flex-col gap-sm text-center">
        {/* Signup title accents "Curio" in italic violet (mockup §2, the
            recurring brand pattern). Login title stays plain — the mockup only
            accents the welcome headline. */}
        {mode === 'signup' ? (
          <AccentText
            before={t('titleBefore')}
            accent={t('titleAccent')}
            after={t('titleAfter')}
            size="h1"
            as="h1"
            className="text-balance"
          />
        ) : (
          <h1 className="font-serif text-h1 leading-tight text-foreground">
            {t('loginTitle')}
          </h1>
        )}
        <p className="font-sans text-body text-foreground/70">{subtitle}</p>
      </header>

      {showEmail ? (
        /* ── Email magic-link sub-view ─────────────────────────────────── */
        <div className="flex flex-col gap-md">
          {stage === 'sent' ? (
            <p
              role="status"
              className="rounded-sm border border-violet/40 bg-violet/10 px-md py-md text-center font-sans text-body-small text-foreground"
            >
              {t('magicLinkSent', { email })}
            </p>
          ) : (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-sm">
              <label htmlFor="auth-email" className="sr-only">
                {t('emailLabel')}
              </label>
              <Input
                id="auth-email"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                error={stage === 'error'}
                disabled={stage === 'sending'}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (stage === 'error') setStage('idle')
                }}
              />
              {stage === 'error' ? (
                <p role="alert" className="font-sans text-meta text-badge-food">
                  {EMAIL_RE.test(email) ? t('errorGeneric') : t('errorEmail')}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={stage === 'sending'}
                className="inline-flex h-11 w-full items-center justify-center gap-sm rounded-full bg-violet px-lg font-sans text-body-small font-medium text-button-text transition-colors duration-base hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic"
              >
                {stage === 'sending' ? t('emailSubmitSending') : t('emailSubmit')}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => {
              setShowEmail(false)
              setStage('idle')
            }}
            className="inline-flex items-center justify-center gap-xs font-sans text-body-small text-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('back')}
          </button>
        </div>
      ) : (
        /* ── Provider chooser ──────────────────────────────────────────── */
        <div className="flex flex-col gap-md">
          <ProviderButton
            onClick={() => handleOAuth('apple')}
            icon={<Apple className="size-5 shrink-0" aria-hidden />}
          >
            {t('continueApple')}
          </ProviderButton>
          <ProviderButton
            onClick={() => handleOAuth('google')}
            icon={<GoogleIcon />}
          >
            {t('continueGoogle')}
          </ProviderButton>
          <ProviderButton
            onClick={() => setShowEmail(true)}
            icon={<Mail className="size-5 shrink-0" aria-hidden />}
          >
            {t('continueEmail')}
          </ProviderButton>

          {oauthError ? (
            <p role="alert" className="text-center font-sans text-meta text-badge-food">
              {oauthError}
            </p>
          ) : null}

          <div className="flex items-center gap-md py-xs">
            <span className="h-px flex-1 bg-foreground/15" />
            <span className="font-sans text-meta text-foreground/50">
              {t('or')}
            </span>
            <span className="h-px flex-1 bg-foreground/15" />
          </div>

          {/* Inline toggle between sign-up and log-in (single screen). */}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'signup' ? 'login' : 'signup'))}
            className="mx-auto font-sans text-body-small text-violet transition-colors hover:opacity-80"
          >
            {mode === 'signup' ? t('logInLink') : t('signUpLink')}
          </button>
        </div>
      )}

      {/* Terms + privacy line (mockup shows it under the providers). */}
      <p className="text-center font-sans text-meta leading-relaxed text-foreground/50">
        {t('termsPrefix')}
        <Link href="/terms" className="underline hover:text-foreground/80">
          {t('terms')}
        </Link>
        {t('termsAnd')}
        <Link href="/privacy" className="underline hover:text-foreground/80">
          {t('privacy')}
        </Link>
        {t('termsSuffix')}
      </p>
    </div>
  )
}

function ProviderButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 w-full items-center justify-center gap-sm rounded-full border border-foreground/20 bg-foreground/[0.04] px-lg font-sans text-body-small font-medium text-foreground transition-colors duration-base hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic"
    >
      {icon}
      {children}
    </button>
  )
}
