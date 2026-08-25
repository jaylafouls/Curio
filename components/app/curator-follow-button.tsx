'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import {
  followCurator,
  unfollowCurator,
  getCuratorFollowState,
  type CuratorFollowState,
} from '@/lib/onboarding/actions'

/**
 * CuratorFollowButton — the viewer's Follow / Following toggle on a public
 * profile (spec §8.10, recette P1-1). The counterpart to CollectionFollowButton
 * for people rather than collections; wired to the existing followCurator /
 * unfollowCurator Server Actions (a fresh follow notifies the curator).
 *
 * Same session-gated discipline: the profile page is anon, ISR-cached and
 * cookie-free, so viewer identity MUST NOT be decided during that render. This
 * client component fetches getCuratorFollowState AFTER hydration and decides:
 *   - still checking → render nothing (no flash of the wrong state).
 *   - viewing own profile → render nothing (you don't follow yourself; Edit
 *     profile is your affordance instead, surfaced on My Space).
 *   - logged out → a "Sign in to follow" link to Welcome (no follow action).
 *   - logged-in other → the Follow / Following toggle.
 *
 * Follow/unfollow are optimistic: the label flips immediately and reverts if the
 * action reports a failure, so the click feels instant while staying honest.
 */
export function CuratorFollowButton({ curatorId }: { curatorId: string }) {
  const t = useTranslations('Profile')
  const [state, setState] = useState<CuratorFollowState | null>(null)
  const [following, setFollowing] = useState(false)
  const [errored, setErrored] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    getCuratorFollowState(curatorId)
      .then((s) => {
        if (!active) return
        setState(s)
        setFollowing(s.isFollowing)
      })
      .catch(() => {
        // Best-effort: a failed check just leaves no follow affordance.
      })
    return () => {
      active = false
    }
  }, [curatorId])

  // Still checking, or viewing own profile → no follow affordance.
  if (!state || state.isSelf) return null

  // Logged out → route to Welcome to sign in rather than expose a dead button.
  if (!state.loggedIn) {
    return (
      <Link href="/">
        <Button
          variant="secondary"
          size="small"
          iconLeft={<UserPlus className="size-4" aria-hidden />}
        >
          {t('followSignIn')}
        </Button>
      </Link>
    )
  }

  const toggle = () => {
    if (pending) return
    const next = !following
    setErrored(false)
    setFollowing(next) // optimistic
    startTransition(async () => {
      const res = next
        ? await followCurator(curatorId)
        : await unfollowCurator(curatorId)
      if (!res.ok) {
        setFollowing(!next) // revert
        setErrored(true)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2xs">
      <Button
        variant={following ? 'secondary' : 'primary'}
        size="small"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        iconLeft={
          following ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )
        }
      >
        {following ? t('followingState') : t('follow')}
      </Button>
      {errored ? (
        <span className="font-sans text-meta text-badge-food" role="alert">
          {t('followError')}
        </span>
      ) : null}
    </div>
  )
}
