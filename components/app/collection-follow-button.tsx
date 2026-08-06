'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import {
  getCollectionFollowState,
  followCollection,
  unfollowCollection,
  type CollectionFollowState,
} from '@/lib/collections/actions'

/**
 * CollectionFollowButton — the viewer's Follow / Following toggle on a public
 * collection page (spec §8.7). Wired to the followCollection / unfollowCollection
 * Server Actions; a fresh follow notifies the collection owner (chantier
 * notifications).
 *
 * Same discipline as CollectionOwnerOverlay: the public page is anon, ISR-cached
 * and cookie-free, so viewer identity MUST NOT be decided during that render.
 * This client component fetches getCollectionFollowState AFTER hydration and
 * decides what to show:
 *   - still checking → render nothing (no layout flash of the wrong state).
 *   - owner → render nothing (the owner never follows their own collection; the
 *     edit overlay is their affordance instead).
 *   - logged out → a "Sign in to follow" link to Welcome (no follow action).
 *   - logged-in non-owner → the Follow / Following toggle.
 *
 * Follow/unfollow are optimistic: the label flips immediately and reverts if the
 * action reports a failure, so the click feels instant while staying honest.
 */
export function CollectionFollowButton({
  collectionId,
}: {
  collectionId: string
}) {
  const t = useTranslations('CollectionDetail')
  const [state, setState] = useState<CollectionFollowState | null>(null)
  const [following, setFollowing] = useState(false)
  const [errored, setErrored] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    getCollectionFollowState(collectionId)
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
  }, [collectionId])

  // Still checking, or the owner → no follow affordance.
  if (!state || state.isOwner) return null

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
        ? await followCollection(collectionId)
        : await unfollowCollection(collectionId)
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
        {following ? t('following') : t('follow')}
      </Button>
      {errored ? (
        <span className="font-sans text-meta text-badge-food" role="alert">
          {t('followError')}
        </span>
      ) : null}
    </div>
  )
}
