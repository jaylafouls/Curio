'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react'
import { AccentText, Avatar, Button } from '@/components/ui'
import { OrbitalLogo } from '@/components/brand/orbital-logo'
import { TopicIcon } from '@/components/brand/topic-icon'
import { cn } from '@/lib/ui/cn'
import type { Locale } from '@/lib/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import {
  completeOnboarding,
  followCurator,
  saveTopics,
  saveUniverse,
  unfollowCurator,
} from '@/lib/onboarding/actions'
import {
  UNIVERSE_COLORS,
  type CuratorSuggestion,
  type Topic,
  type UniverseColor,
} from '@/lib/onboarding/types'

/**
 * OnboardingWizard — the funnel's five visible screens (UX §1, screens 03-07),
 * driven client-side over a fixed step order. Data (topics, curator suggestions,
 * pre-selected topic ids) is fetched server-side and handed in as props; each
 * write goes through the matching Server Action in lib/onboarding/actions.ts.
 *
 * Steps 03/04/05 carry the "Step N/3" progress label; 06 (ready) and 07 (all
 * set) are confirmation screens with no counter. The universe name entered at
 * 05 is held in wizard state so screen 06 can greet it before the row exists in
 * a fresh read.
 *
 * Forced Cosmic (dark): the whole funnel is dark in the mockups, like Welcome
 * and Sign up. The page wraps this in `.dark`; here we only lay out on that
 * surface.
 */

const STEPS = ['interests', 'curators', 'universe', 'ready', 'allSet'] as const
type Step = (typeof STEPS)[number]

/** The three counted steps show "Step N/3"; ready/allSet do not. */
const COUNTED: Step[] = ['interests', 'curators', 'universe']

// The 5 fixed universe swatches, mapped to their token hex so the picker
// renders the real colour (the enum value is what we persist).
const COLOR_HEX: Record<UniverseColor, string> = {
  violet: '#785CFF',
  beige: '#D9C6A6',
  vert: '#6A7B7A',
  bleu: '#5B7088',
  rose: '#D9AFAE',
}

export interface OnboardingWizardProps {
  locale: Locale
  topics: Topic[]
  curators: CuratorSuggestion[]
  /** Topic ids already saved (resuming an interrupted funnel). */
  initialSelectedTopicIds: string[]
}

export function OnboardingWizard({
  locale,
  topics,
  curators,
  initialSelectedTopicIds,
}: OnboardingWizardProps) {
  const t = useTranslations('Onboarding')

  const [step, setStep] = useState<Step>('interests')
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    () => new Set(initialSelectedTopicIds),
  )
  const [followed, setFollowed] = useState<Set<string>>(() => new Set())
  const [universeName, setUniverseName] = useState('')
  const [universeColor, setUniverseColor] = useState<UniverseColor>('violet')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const stepIndex = STEPS.indexOf(step)
  const counter = COUNTED.indexOf(step) // -1 for ready/allSet

  // When the current step began, so we can report time-on-step as `duration`
  // (ms) with the onboarding_step_completed event. Reset on every transition.
  const stepStartedAt = useRef<number>(Date.now())

  function goTo(next: Step) {
    setError(null)
    const nextIndex = STEPS.indexOf(next)
    // Emit only on a forward move: the step being LEFT is the one completed.
    // `back` also routes through here; a backward move completes nothing.
    if (nextIndex > stepIndex) {
      trackEvent('onboarding_step_completed', {
        step, // the step just finished
        duration: Date.now() - stepStartedAt.current,
      })
    }
    stepStartedAt.current = Date.now()
    setStep(next)
  }

  function back() {
    if (stepIndex === 0) return
    goTo(STEPS[stepIndex - 1])
  }

  // ── Screen 03: persist topics, then advance to curators. ────────────────
  function submitInterests() {
    if (selectedTopics.size === 0) {
      setError(t('interests.minHint'))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await saveTopics([...selectedTopics])
      if (!res.ok) {
        setError(t('errorGeneric'))
        return
      }
      goTo('curators')
    })
  }

  // ── Screen 04: toggling follow persists immediately (optimistic). ───────
  function toggleFollow(id: string) {
    const isFollowing = followed.has(id)
    // Optimistic: reflect the tap now, revert if the write fails.
    setFollowed((prev) => {
      const nextSet = new Set(prev)
      if (isFollowing) nextSet.delete(id)
      else nextSet.add(id)
      return nextSet
    })
    startTransition(async () => {
      const res = isFollowing
        ? await unfollowCurator(id)
        : await followCurator(id)
      if (!res.ok) {
        setError(t('errorGeneric'))
        setFollowed((prev) => {
          const revert = new Set(prev)
          if (isFollowing) revert.add(id)
          else revert.delete(id)
          return revert
        })
      }
    })
  }

  // ── Screen 05: create the universe, then advance to the ready screen. ───
  function submitUniverse(e: FormEvent) {
    e.preventDefault()
    const trimmed = universeName.trim()
    if (trimmed.length < 1) {
      setError(t('universe.nameRequired'))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await saveUniverse(trimmed, universeColor)
      if (!res.ok) {
        setError(t('errorGeneric'))
        return
      }
      goTo('ready')
    })
  }

  // ── Screen 07: finish → flips onboarding_completed and redirects to Home.
  function finish() {
    setError(null)
    // The final step completes here (it never goes through goTo → no forward
    // transition). Emit before the server redirect so the last step is counted.
    trackEvent('onboarding_step_completed', {
      step: 'allSet',
      duration: Date.now() - stepStartedAt.current,
    })
    startTransition(async () => {
      await completeOnboarding(locale)
      // completeOnboarding redirects server-side; nothing runs after it.
    })
  }

  return (
    <div className="flex w-full max-w-md flex-1 flex-col py-2xl">
      {/* Progress header — only on the three counted steps. */}
      {counter >= 0 ? (
        <div className="mb-xl flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={back}
                disabled={pending}
                className="inline-flex items-center gap-xs font-sans text-body-small text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft className="size-4" aria-hidden />
                {t('back')}
              </button>
            ) : (
              <span />
            )}
            <span className="font-sans text-meta text-foreground/50">
              {t('stepLabel', { current: counter + 1, total: 3 })}
            </span>
          </div>
          {/* Segmented progress bar over the three counted steps. */}
          <div className="flex gap-xs" aria-hidden>
            {COUNTED.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-base',
                  i <= counter ? 'bg-violet' : 'bg-foreground/15',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div key={step} className="flex flex-1 animate-fade-in flex-col">
        {step === 'interests' ? (
          <InterestsStep
            topics={topics}
            selected={selectedTopics}
            onToggle={(id) =>
              setSelectedTopics((prev) => {
                const nextSet = new Set(prev)
                if (nextSet.has(id)) nextSet.delete(id)
                else nextSet.add(id)
                return nextSet
              })
            }
            onContinue={submitInterests}
            pending={pending}
            error={error}
          />
        ) : null}

        {step === 'curators' ? (
          <CuratorsStep
            curators={curators}
            followed={followed}
            onToggleFollow={toggleFollow}
            onContinue={() => goTo('universe')}
            error={error}
          />
        ) : null}

        {step === 'universe' ? (
          <UniverseStep
            name={universeName}
            color={universeColor}
            onNameChange={setUniverseName}
            onColorChange={setUniverseColor}
            onSubmit={submitUniverse}
            pending={pending}
            error={error}
          />
        ) : null}

        {step === 'ready' ? (
          <ReadyStep
            name={universeName.trim()}
            onContinue={() => goTo('allSet')}
          />
        ) : null}

        {step === 'allSet' ? (
          <AllSetStep onFinish={finish} pending={pending} error={error} />
        ) : null}
      </div>
    </div>
  )
}

/* ── Screen 03 — Interests ──────────────────────────────────────────────── */

function InterestsStep({
  topics,
  selected,
  onToggle,
  onContinue,
  pending,
  error,
}: {
  topics: Topic[]
  selected: Set<string>
  onToggle: (id: string) => void
  onContinue: () => void
  pending: boolean
  error: string | null
}) {
  const t = useTranslations('Onboarding')

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-sm">
        <AccentText
          before={t('interests.titleBefore')}
          accent={t('interests.titleAccent')}
          after={t('interests.titleAfter')}
          size="h1"
          as="h1"
          className="text-balance"
        />
        <p className="font-sans text-body text-foreground/70">
          {t('interests.subtitle')}
        </p>
      </header>

      <div className="mt-xl flex flex-wrap gap-sm" role="group">
        {topics.map((topic) => {
          const active = selected.has(topic.id)
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(topic.id)}
              className={cn(
                'inline-flex items-center gap-sm rounded-full border px-md py-sm font-sans text-body-small font-medium transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic',
                active
                  ? 'border-violet bg-violet/15 text-foreground'
                  : 'border-foreground/20 bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]',
              )}
            >
              <TopicIcon
                name={topic.icon}
                className={cn('size-4', active ? 'text-violet' : 'text-foreground/60')}
                strokeWidth={2}
              />
              {topic.label}
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-sm pt-2xl">
        {error ? (
          <p role="alert" className="text-center font-sans text-meta text-badge-food">
            {error}
          </p>
        ) : null}
        <Button
          variant="primary"
          onClick={onContinue}
          disabled={pending || selected.size === 0}
          iconRight={<ArrowRight className="size-4" />}
          className="w-full"
        >
          {pending ? t('saving') : t('continue')}
        </Button>
      </div>
    </div>
  )
}

/* ── Screen 04 — Curators ───────────────────────────────────────────────── */

function CuratorsStep({
  curators,
  followed,
  onToggleFollow,
  onContinue,
  error,
}: {
  curators: CuratorSuggestion[]
  followed: Set<string>
  onToggleFollow: (id: string) => void
  onContinue: () => void
  error: string | null
}) {
  const t = useTranslations('Onboarding')
  const isEmpty = curators.length === 0

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-sm">
        <AccentText
          before={t('curators.titleBefore')}
          accent={t('curators.titleAccent')}
          size="h1"
          as="h1"
          className="text-balance"
        />
        <p className="font-sans text-body text-foreground/70">
          {t('curators.subtitle')}
        </p>
      </header>

      {isEmpty ? (
        // No Founding Curators recruited yet → the designed empty state (UX §04).
        <div className="mt-xl flex flex-col items-center gap-md rounded-lg border border-foreground/15 bg-foreground/[0.04] px-lg py-2xl text-center">
          <OrbitalLogo label={t('logoAlt')} size={64} />
          <h2 className="font-serif text-h3 text-foreground">
            {t('curators.emptyTitle')}
          </h2>
          <p className="max-w-xs font-sans text-body-small text-foreground/70">
            {t('curators.emptyBody')}
          </p>
        </div>
      ) : (
        <ul className="mt-xl flex flex-col gap-md">
          {curators.map((c) => {
            const isFollowing = followed.has(c.id)
            return (
              <li
                key={c.id}
                className="flex items-center gap-md rounded-lg border border-border-light bg-foreground/[0.03] p-md"
              >
                <Avatar src={c.avatarUrl ?? undefined} name={c.displayName} size="md" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-serif text-h3 leading-tight text-foreground">
                    {c.displayName}
                  </span>
                  <span className="truncate font-sans text-meta text-foreground/60">
                    {c.role}
                  </span>
                </div>
                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="small"
                  onClick={() => onToggleFollow(c.id)}
                  iconLeft={
                    isFollowing ? (
                      <Check className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )
                  }
                >
                  {isFollowing ? t('curators.following') : t('curators.follow')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-sm pt-2xl">
        {error ? (
          <p role="alert" className="text-center font-sans text-meta text-badge-food">
            {error}
          </p>
        ) : null}
        <Button
          variant="primary"
          onClick={onContinue}
          iconRight={<ArrowRight className="size-4" />}
          className="w-full"
        >
          {isEmpty ? t('curators.skip') : t('continue')}
        </Button>
      </div>
    </div>
  )
}

/* ── Screen 05 — Universe ───────────────────────────────────────────────── */

const NAME_MAX = 20

function UniverseStep({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  pending,
  error,
}: {
  name: string
  color: UniverseColor
  onNameChange: (v: string) => void
  onColorChange: (c: UniverseColor) => void
  onSubmit: (e: FormEvent) => void
  pending: boolean
  error: string | null
}) {
  const t = useTranslations('Onboarding')

  const colorLabel: Record<UniverseColor, string> = {
    violet: t('universe.colorViolet'),
    beige: t('universe.colorBeige'),
    vert: t('universe.colorVert'),
    bleu: t('universe.colorBleu'),
    rose: t('universe.colorRose'),
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col">
      <header className="flex flex-col gap-sm">
        <AccentText
          before={t('universe.titleBefore')}
          accent={t('universe.titleAccent')}
          size="h1"
          as="h1"
          className="text-balance"
        />
        <p className="font-sans text-body text-foreground/70">
          {t('universe.subtitle')}
        </p>
      </header>

      <div className="mt-xl flex flex-col gap-md">
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <label
              htmlFor="universe-name"
              className="font-sans text-body-small font-medium text-foreground"
            >
              {t('universe.nameLabel')}
            </label>
            <span className="font-sans text-meta text-foreground/50">
              {t('universe.counter', { count: name.length, max: NAME_MAX })}
            </span>
          </div>
          {/* Text field mirrors the Input shell but is a plain input here so the
              form owns submit-on-enter; on-token border + violet focus ring. */}
          <input
            id="universe-name"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder={t('universe.namePlaceholder')}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onNameChange(e.target.value)}
            className={cn(
              'h-11 w-full rounded-sm border bg-foreground/[0.03] px-md font-sans text-body-small text-foreground placeholder:text-foreground/40 transition-colors duration-fast focus:outline-none focus:ring-2',
              error
                ? 'border-badge-food focus:ring-badge-food/40'
                : 'border-border-light focus:border-violet focus:ring-violet/30',
            )}
          />
        </div>

        <fieldset className="flex flex-col gap-sm">
          <legend className="mb-xs font-sans text-body-small font-medium text-foreground">
            {t('universe.colorLabel')}
          </legend>
          <div className="flex items-center gap-md" role="radiogroup">
            {UNIVERSE_COLORS.map((c) => {
              const active = color === c
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={colorLabel[c]}
                  onClick={() => onColorChange(c)}
                  className={cn(
                    'relative inline-flex size-10 items-center justify-center rounded-full transition-transform duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-cosmic',
                    active
                      ? 'ring-2 ring-foreground ring-offset-2 ring-offset-cosmic'
                      : 'hover:scale-105',
                  )}
                >
                  <span
                    className="size-8 rounded-full"
                    style={{ backgroundColor: COLOR_HEX[c] }}
                  />
                  {active ? (
                    <Check
                      className="absolute size-4 text-cosmic mix-blend-difference"
                      strokeWidth={3}
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-auto flex flex-col gap-sm pt-2xl">
        {error ? (
          <p role="alert" className="text-center font-sans text-meta text-badge-food">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          disabled={pending || name.trim().length === 0}
          className="w-full"
        >
          {pending ? t('saving') : t('universe.submit')}
        </Button>
      </div>
    </form>
  )
}

/* ── Screen 06 — Universe ready ─────────────────────────────────────────── */

function ReadyStep({
  name,
  onContinue,
}: {
  name: string
  onContinue: () => void
}) {
  const t = useTranslations('Onboarding')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-xl text-center">
      <OrbitalLogo label={t('logoAlt')} size={128} />
      <div className="flex flex-col gap-sm">
        <h1 className="font-serif text-h1 leading-tight text-foreground">
          {t('ready.title')}
        </h1>
        <p className="max-w-xs font-sans text-body text-foreground/70">
          {name ? t('ready.body', { name }) : t('ready.bodyNoName')}
        </p>
      </div>
      <Button
        variant="primary"
        onClick={onContinue}
        iconRight={<ArrowRight className="size-4" />}
        className="w-full max-w-xs"
      >
        {t('ready.cta')}
      </Button>
    </div>
  )
}

/* ── Screen 07 — You're all set ─────────────────────────────────────────── */

function AllSetStep({
  onFinish,
  pending,
  error,
}: {
  onFinish: () => void
  pending: boolean
  error: string | null
}) {
  const t = useTranslations('Onboarding')

  const pillars = [
    { title: t('allSet.saveTitle'), body: t('allSet.saveBody') },
    { title: t('allSet.organizeTitle'), body: t('allSet.organizeBody') },
    { title: t('allSet.discoverTitle'), body: t('allSet.discoverBody') },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-sm text-center">
        <AccentText
          before={t('allSet.titleBefore')}
          accent={t('allSet.titleAccent')}
          size="h1"
          as="h1"
        />
        <p className="font-sans text-body text-foreground/70">
          {t('allSet.subtitle')}
        </p>
      </header>

      <ul className="mt-xl flex flex-col gap-md">
        {pillars.map((p, i) => (
          <li
            key={p.title}
            className="flex items-start gap-md rounded-lg border border-border-light bg-foreground/[0.03] p-md"
          >
            <span
              className="mt-xs inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet/15 font-sans text-body-small font-medium text-violet"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-xs">
              <h2 className="font-serif text-h3 leading-tight text-foreground">
                {p.title}
              </h2>
              <p className="font-sans text-body-small text-foreground/70">
                {p.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-sm pt-2xl">
        {error ? (
          <p role="alert" className="text-center font-sans text-meta text-badge-food">
            {error}
          </p>
        ) : null}
        <Button
          variant="primary"
          onClick={onFinish}
          disabled={pending}
          iconRight={<ArrowRight className="size-4" />}
          className="w-full"
        >
          {pending ? t('saving') : t('allSet.cta')}
        </Button>
      </div>
    </div>
  )
}
