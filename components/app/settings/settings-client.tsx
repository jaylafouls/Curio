'use client'

import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import {
  Upload,
  X,
  Check,
  Globe,
  Mail,
  ShieldCheck,
  Trash2,
  Bell,
  CreditCard,
  Palette,
  Puzzle,
  Copy,
  KeyRound,
} from 'lucide-react'
import { Button, Input, Modal, Avatar, ThemeToggle } from '@/components/ui'
import type { ThemeMode } from '@/components/ui'
import { cn } from '@/lib/ui/cn'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { reopenConsent } from '@/lib/consent/store'
import {
  updateProfile,
  updateLanguage,
  deleteAccount,
} from '@/lib/settings/actions'
import {
  createExtensionToken,
  revokeExtensionTokenAction,
} from '@/lib/extension/actions'
import type { ExtensionTokenSummary } from '@/lib/extension/data'
import { updateThemePreference } from '@/lib/theme/actions'
import {
  modeToPreference,
  preferenceToMode,
  type ThemePreference,
} from '@/lib/theme/types'
import type { SettingsProfile, ConnectedIdentity } from '@/lib/settings/data'
import type { Locale } from '@/lib/i18n/routing'

/**
 * SettingsClient — the /settings surface (spec §8.14, chantier 13). One client
 * component orchestrating the account sections; each section is a small local
 * subcomponent below. Sections that back real features (Profile, Language,
 * Privacy, Connected apps, Delete account) do real work; Notifications, Billing
 * and Theme are scaffolded "Coming soon" (Theme's real persisted toggle is
 * deferred to Phase 5 — no partial/unverified dark mode ships before a full
 * dark-mode audit of the connected pages).
 *
 * Data is loaded server-side and passed in; writes go through the settings
 * Server Actions (RLS-scoped; delete uses the admin cascade). Avatar upload
 * mirrors the collection-cover mechanism exactly: client → Storage under the
 * '<uid>/…' prefix, only the resulting public URL reaches updateProfile.
 */

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function SettingsClient({
  profile,
  identities,
  locale,
  themePreference,
  extensionTokens,
}: {
  profile: SettingsProfile
  identities: ConnectedIdentity[]
  locale: Locale
  themePreference: ThemePreference
  extensionTokens: ExtensionTokenSummary[]
}) {
  const t = useTranslations('Settings')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2xl px-lg py-2xl lg:px-2xl">
      <header className="flex flex-col gap-xs">
        <h1 className="font-serif text-h1 text-foreground">{t('title')}</h1>
        <p className="font-sans text-body text-foreground/60">{t('subtitle')}</p>
      </header>

      <ProfileSection profile={profile} />
      <LanguageSection current={profile.language} />
      <PrivacySection />
      <ConnectedSection identities={identities} />
      <ExtensionSection tokens={extensionTokens} locale={locale} />
      <ComingSoonSection
        icon={<Bell className="size-5" aria-hidden />}
        heading={t('notificationsHeading')}
        body={t('notificationsComingSoon')}
      />
      <ComingSoonSection
        icon={<CreditCard className="size-5" aria-hidden />}
        heading={t('billingHeading')}
        body={t('billingComingSoon')}
      />
      <ThemeSection initial={themePreference} />
      <DeleteSection locale={locale} />
    </div>
  )
}

// ── Section shell ────────────────────────────────────────────────────────────

function Section({
  heading,
  hint,
  children,
  danger = false,
}: {
  heading: string
  hint?: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-lg rounded-lg border bg-foreground/[0.02] p-lg',
        danger ? 'border-badge-food/40' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-2xs">
        <h2
          className={cn(
            'font-serif text-h3',
            danger ? 'text-badge-food' : 'text-foreground',
          )}
        >
          {heading}
        </h2>
        {hint ? (
          <p className="font-sans text-body-small text-foreground/50">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor={id}
        className="font-sans text-body-small font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="font-sans text-meta text-foreground/50">{hint}</p>
      ) : null}
    </div>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ profile }: { profile: SettingsProfile }) {
  const t = useTranslations('Settings')

  const [displayName, setDisplayName] = useState(profile.displayName)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [website, setWebsite] = useState(profile.websiteUrl ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatarFile(file: File) {
    setError(null)
    setSaved(false)
    if (!file.type.startsWith('image/')) {
      setError(t('errorImageType'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t('errorImageSize'))
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      // Path MUST start with the user's id (Storage RLS prefix check).
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        console.error('avatar upload failed', { message: upErr.message })
        setError(t('errorUpload'))
        return
      }
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateProfile({
        displayName,
        username,
        bio: bio.trim() || null,
        location: location.trim() || null,
        websiteUrl: website.trim() || null,
        // '' clears the avatar; a URL sets it; unchanged still re-sends the
        // current value which the action validates against the avatars bucket.
        avatarUrl: avatarUrl ?? '',
      })
      if (!res.ok) {
        setError(
          res.error === 'username_taken'
            ? t('errorUsernameTaken')
            : res.error === 'invalid'
              ? t('errorInvalid')
              : t('errorServer'),
        )
        return
      }
      setSaved(true)
    })
  }

  return (
    <Section heading={t('profileHeading')} hint={t('profileHint')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        {/* Avatar */}
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-body-small font-medium text-foreground">
            {t('avatarLabel')}
          </span>
          <div className="flex items-center gap-md">
            <Avatar
              src={avatarUrl ?? undefined}
              name={displayName || profile.username}
              size="lg"
            />
            <div className="flex items-center gap-sm">
              <Button
                variant="secondary"
                size="small"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                iconLeft={<Upload className="size-4" aria-hidden />}
              >
                {uploading ? t('avatarUploading') : t('avatarUpload')}
              </Button>
              {avatarUrl ? (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => {
                    setAvatarUrl(null)
                    setSaved(false)
                  }}
                  iconLeft={<X className="size-4" aria-hidden />}
                >
                  {t('avatarRemove')}
                </Button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleAvatarFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        <Field id="settings-display-name" label={t('displayNameLabel')}>
          <Input
            id="settings-display-name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setSaved(false)
            }}
            placeholder={t('displayNamePlaceholder')}
            maxLength={80}
          />
        </Field>

        <Field
          id="settings-username"
          label={t('usernameLabel')}
          hint={t('usernameHint')}
        >
          <Input
            id="settings-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase())
              setSaved(false)
            }}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>

        <Field
          id="settings-bio"
          label={t('bioLabel')}
          hint={t('bioCounter', { count: bio.length })}
        >
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value)
              setSaved(false)
            }}
            placeholder={t('bioPlaceholder')}
            maxLength={160}
            rows={3}
            className="w-full rounded-sm border border-border bg-foreground/[0.03] px-md py-sm font-sans text-body-small text-foreground placeholder:text-foreground/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </Field>

        <Field id="settings-location" label={t('locationLabel')}>
          <Input
            id="settings-location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value)
              setSaved(false)
            }}
            placeholder={t('locationPlaceholder')}
            maxLength={120}
          />
        </Field>

        <Field id="settings-website" label={t('websiteLabel')}>
          <Input
            id="settings-website"
            type="url"
            inputMode="url"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value)
              setSaved(false)
            }}
            placeholder={t('websitePlaceholder')}
            maxLength={300}
          />
        </Field>

        {error ? (
          <p className="font-sans text-body-small text-badge-food" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            className="flex items-center gap-xs font-sans text-body-small text-badge-wellness"
            role="status"
          >
            <Check className="size-4" aria-hidden />
            {t('profileSaved')}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || uploading}>
            {pending ? t('profileSaving') : t('profileSave')}
          </Button>
        </div>
      </form>
    </Section>
  )
}

// ── Language ─────────────────────────────────────────────────────────────────

function LanguageSection({ current }: { current: Locale }) {
  const t = useTranslations('Settings')
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<Locale | null>(null)

  function choose(next: Locale) {
    if (next === current || pending) return
    setTarget(next)
    startTransition(async () => {
      // Persist the preference (best-effort — the switch itself is the URL nav
      // below, which is what the user immediately sees). A failed persist just
      // means it won't be remembered cross-device; it does not block the switch.
      await updateLanguage(next)
      // Swap locale on the SAME path (localePrefix 'always' → /en|/fr prefix).
      router.replace(pathname, { locale: next })
    })
  }

  const options: { value: Locale; label: string }[] = [
    { value: 'en', label: t('languageEnglish') },
    { value: 'fr', label: t('languageFrench') },
  ]

  return (
    <Section heading={t('languageHeading')} hint={t('languageHint')}>
      <div
        className="flex flex-col gap-sm sm:flex-row"
        role="radiogroup"
        aria-label={t('languageHeading')}
      >
        {options.map((opt) => {
          const active = opt.value === current
          const isSwitching = pending && target === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(opt.value)}
              className={cn(
                'flex flex-1 items-center justify-between gap-sm rounded-md border px-md py-sm text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:cursor-not-allowed',
                active
                  ? 'border-violet bg-violet/10 text-foreground'
                  : 'border-border text-foreground/70 hover:bg-foreground/[0.03]',
              )}
            >
              <span className="font-sans text-body-small font-medium">
                {opt.label}
              </span>
              {isSwitching ? (
                <span className="font-sans text-meta text-foreground/50">
                  {t('languageSaving')}
                </span>
              ) : active ? (
                <Check className="size-4 text-violet" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ── Privacy ──────────────────────────────────────────────────────────────────

function PrivacySection() {
  const t = useTranslations('Settings')
  return (
    <Section heading={t('privacyHeading')} hint={t('privacyHint')}>
      <div className="flex flex-col gap-md rounded-md border border-border bg-foreground/[0.02] p-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-sm">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-violet"
            aria-hidden
          />
          <div className="flex flex-col gap-2xs">
            <span className="font-sans text-body-small font-medium text-foreground">
              {t('privacyPreferenceCenter')}
            </span>
            <span className="font-sans text-meta text-foreground/60">
              {t('privacyPreferenceCenterBody')}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => reopenConsent()}
          className="shrink-0"
        >
          {t('privacyOpenPreferences')}
        </Button>
      </div>
    </Section>
  )
}

// ── Connected apps ───────────────────────────────────────────────────────────

function ConnectedSection({
  identities,
}: {
  identities: ConnectedIdentity[]
}) {
  const t = useTranslations('Settings')

  function providerLabel(provider: string): string {
    if (provider === 'google') return t('connectedProviderGoogle')
    if (provider === 'email') return t('connectedProviderEmail')
    return provider
  }

  function providerIcon(provider: string) {
    return provider === 'google' ? (
      <Globe className="size-5 shrink-0 text-foreground/60" aria-hidden />
    ) : (
      <Mail className="size-5 shrink-0 text-foreground/60" aria-hidden />
    )
  }

  return (
    <Section heading={t('connectedHeading')} hint={t('connectedHint')}>
      {identities.length === 0 ? (
        <p className="font-sans text-body-small text-foreground/50">
          {t('connectedEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {identities.map((identity) => (
            <li
              key={`${identity.provider}-${identity.label ?? ''}`}
              className="flex items-center gap-md py-md first:pt-0 last:pb-0"
            >
              {providerIcon(identity.provider)}
              <div className="flex min-w-0 flex-col">
                <span className="font-sans text-body-small font-medium text-foreground">
                  {providerLabel(identity.provider)}
                </span>
                {identity.label ? (
                  <span className="truncate font-sans text-meta text-foreground/50">
                    {identity.label}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Chrome extension tokens ──────────────────────────────────────────────────

/**
 * ExtensionSection — "Connect the Chrome extension" (Phase 5 chantier 5,
 * Decisions Log §17). The extension authenticates with a dedicated bearer token,
 * NOT the web session cookie (no cross-origin cookie sharing). This section:
 *   • lists the user's active tokens (metadata only — the raw token never comes
 *     back from the server),
 *   • mints a new token (raw value shown EXACTLY ONCE, with copy-to-clipboard),
 *   • revokes a token (kills that credential immediately).
 *
 * The just-minted raw token lives only in local component state and is cleared
 * as soon as the user dismisses the reveal panel — it is never re-fetchable.
 */
function ExtensionSection({
  tokens,
  locale,
}: {
  tokens: ExtensionTokenSummary[]
  locale: Locale
}) {
  const t = useTranslations('Settings')

  // Live list (optimistic add/remove without a full page refresh).
  const [list, setList] = useState<ExtensionTokenSummary[]>(tokens)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // The raw token from the most recent mint — shown once, then dismissed.
  const [minted, setMinted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const dateFmt = new Intl.DateTimeFormat(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )

  function handleGenerate() {
    if (pending) return
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const res = await createExtensionToken(label.trim() || null)
      if (!res.ok) {
        setError(t('errorServer'))
        return
      }
      setMinted(res.token)
      // Prepend the new token to the list; timestamps come from "now".
      setList((prev) => [
        {
          id: res.id,
          label: label.trim() || null,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          expiresAt: null,
          revoked: false,
        },
        ...prev,
      ])
      setLabel('')
    })
  }

  function handleRevoke(id: string) {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const res = await revokeExtensionTokenAction(id)
      if (!res.ok) {
        setError(t('errorServer'))
        return
      }
      setList((prev) => prev.filter((tok) => tok.id !== id))
    })
  }

  async function copyToken() {
    if (!minted) return
    try {
      await navigator.clipboard.writeText(minted)
      setCopied(true)
    } catch {
      // Clipboard blocked (permissions/insecure context) — the token is still
      // visible for a manual copy, so this is a soft failure.
      setCopied(false)
    }
  }

  return (
    <Section heading={t('extensionHeading')} hint={t('extensionHint')}>
      <div className="flex flex-col gap-lg">
        {/* Just-minted token reveal (shown once). */}
        {minted ? (
          <div
            className="flex flex-col gap-sm rounded-md border border-violet/40 bg-violet/[0.06] p-md"
            role="status"
          >
            <div className="flex items-start gap-sm">
              <KeyRound className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden />
              <div className="flex flex-col gap-2xs">
                <span className="font-sans text-body-small font-medium text-foreground">
                  {t('extensionTokenRevealTitle')}
                </span>
                <span className="font-sans text-meta text-foreground/60">
                  {t('extensionTokenRevealBody')}
                </span>
              </div>
            </div>
            <code className="block w-full overflow-x-auto rounded-sm border border-border bg-background px-md py-sm font-mono text-body-small text-foreground">
              {minted}
            </code>
            <div className="flex items-center justify-end gap-sm">
              <Button
                variant="secondary"
                size="small"
                onClick={copyToken}
                iconLeft={
                  copied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )
                }
              >
                {copied ? t('extensionTokenCopied') : t('extensionTokenCopy')}
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setMinted(null)
                  setCopied(false)
                }}
              >
                {t('extensionTokenDismiss')}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Generate a new token. */}
        <div className="flex flex-col gap-sm sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-xs">
            <label
              htmlFor="settings-extension-label"
              className="font-sans text-body-small font-medium text-foreground"
            >
              {t('extensionLabelLabel')}
            </label>
            <Input
              id="settings-extension-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('extensionLabelPlaceholder')}
              maxLength={80}
              disabled={pending}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={pending}
            iconLeft={<Puzzle className="size-4" aria-hidden />}
            className="shrink-0"
          >
            {pending ? t('extensionGenerating') : t('extensionGenerate')}
          </Button>
        </div>

        {error ? (
          <p className="font-sans text-body-small text-badge-food" role="alert">
            {error}
          </p>
        ) : null}

        {/* Active tokens list. */}
        {list.length === 0 ? (
          <p className="font-sans text-body-small text-foreground/50">
            {t('extensionEmpty')}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {list.map((tok) => (
              <li
                key={tok.id}
                className="flex items-center gap-md py-md first:pt-0 last:pb-0"
              >
                <KeyRound
                  className="size-5 shrink-0 text-foreground/60"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-sans text-body-small font-medium text-foreground">
                    {tok.label ?? t('extensionUnnamed')}
                  </span>
                  <span className="font-sans text-meta text-foreground/50">
                    {tok.lastUsedAt
                      ? t('extensionLastUsed', {
                          date: dateFmt.format(new Date(tok.lastUsedAt)),
                        })
                      : t('extensionNeverUsed', {
                          date: dateFmt.format(new Date(tok.createdAt)),
                        })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleRevoke(tok.id)}
                  disabled={pending}
                  iconLeft={<X className="size-4" aria-hidden />}
                  className="shrink-0 text-badge-food hover:bg-badge-food/5"
                >
                  {t('extensionRevoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

// ── Theme (Cosmic / Archive) ─────────────────────────────────────────────────

/**
 * ThemeSection — the real persisted theme toggle (spec §8.14, Decisions Log §16,
 * Phase 5). Controlled ThemeToggle: this section owns both the live DOM flip and
 * the persistence, so the toggle stays a pure visual control.
 *
 * The `.dark` class is scoped to the connected AppShell boundary
 * (`[data-app-shell]`), NOT <html> — Cosmic mode applies to authenticated pages
 * only, matching where the server applies it on load. The persist is best-effort
 * (mirrors the Language section): a failed write only means the choice won't be
 * remembered cross-device; it never blocks the immediate visual switch.
 */
function ThemeSection({ initial }: { initial: ThemePreference }) {
  const t = useTranslations('Settings')
  const [mode, setMode] = useState<ThemeMode>(() => preferenceToMode(initial))
  const [, startTransition] = useTransition()

  function choose(next: ThemeMode) {
    setMode(next)
    // Live flip on the connected theme boundary (the AppShell root). Falls back
    // to <html> only if the marker is somehow absent (defensive; the shell
    // always renders it on connected pages).
    const target =
      document.querySelector<HTMLElement>('[data-app-shell]') ??
      document.documentElement
    target.classList.toggle('dark', next === 'cosmic')
    // Persist (best-effort) so the choice survives across sessions/devices.
    startTransition(async () => {
      await updateThemePreference(modeToPreference(next))
    })
  }

  const isCosmic = mode === 'cosmic'

  return (
    <Section heading={t('themeHeading')} hint={t('themeHint')}>
      <div className="flex flex-col gap-md rounded-md border border-border bg-foreground/[0.02] p-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-sm">
          <Palette className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden />
          <div className="flex flex-col gap-2xs">
            <span className="font-sans text-body-small font-medium text-foreground">
              {isCosmic ? t('themeCosmic') : t('themeArchive')}
            </span>
            <span className="font-sans text-meta text-foreground/60">
              {isCosmic ? t('themeCosmicBody') : t('themeArchiveBody')}
            </span>
          </div>
        </div>
        <ThemeToggle
          mode={mode}
          onModeChange={choose}
          className="shrink-0 self-start sm:self-auto"
        />
      </div>
    </Section>
  )
}

// ── Coming soon (Notifications / Billing) ────────────────────────────────────

function ComingSoonSection({
  icon,
  heading,
  body,
}: {
  icon: ReactNode
  heading: string
  body: string
}) {
  const t = useTranslations('Settings')
  return (
    <Section heading={heading}>
      <div className="flex items-center gap-md rounded-md border border-dashed border-border bg-foreground/[0.02] p-md text-foreground/50">
        <span className="shrink-0 text-foreground/40">{icon}</span>
        <div className="flex min-w-0 flex-col gap-2xs">
          <span className="inline-flex w-fit items-center rounded-full bg-foreground/10 px-sm py-2xs font-sans text-meta font-medium uppercase tracking-wide text-foreground/60">
            {t('comingSoon')}
          </span>
          <span className="font-sans text-body-small">{body}</span>
        </div>
      </div>
    </Section>
  )
}

// ── Delete account ───────────────────────────────────────────────────────────

function DeleteSection({ locale }: { locale: Locale }) {
  const t = useTranslations('Settings')
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const confirmWord = t('deleteConfirmWord')
  const canDelete = confirm.trim().toUpperCase() === confirmWord.toUpperCase()

  function handleDelete() {
    if (!canDelete || pending) return
    setError(null)
    startTransition(async () => {
      const res = await deleteAccount(locale)
      if (!res.ok) {
        setError(t('errorServer'))
        return
      }
      // Hard navigation out of the now-deleted session so no stale RSC cache or
      // client state lingers; lands on the locale home (Welcome).
      window.location.assign(res.redirectTo)
    })
  }

  return (
    <>
      <Section heading={t('dangerHeading')} hint={t('dangerHint')} danger>
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirm('')
              setError(null)
              setOpen(true)
            }}
            iconLeft={<Trash2 className="size-4" aria-hidden />}
            className="border-badge-food/50 text-badge-food hover:bg-badge-food/5"
          >
            {t('deleteCta')}
          </Button>
        </div>
      </Section>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={t('deleteModalTitle')}
      >
        <div className="flex flex-col gap-lg">
          <p className="font-sans text-body-small text-text-dark/70">
            {t('deleteModalBody')}
          </p>

          <div className="flex flex-col gap-xs">
            <label
              htmlFor="settings-delete-confirm"
              className="font-sans text-body-small font-medium text-text-dark"
            >
              {t('deleteConfirmLabel')}
            </label>
            <Input
              id="settings-delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={pending}
            />
          </div>

          {error ? (
            <p
              className="font-sans text-body-small text-badge-food"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-sm">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t('deleteCancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!canDelete || pending}
              className="bg-badge-food text-white hover:opacity-90"
            >
              {pending ? t('deleteDeleting') : t('deleteConfirmCta')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
