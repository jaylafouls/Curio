import { createClient } from '@/lib/supabase/server'

/**
 * Plan plumbing (spec §4.1) — the free-plan side only. No Stripe, no billing:
 * during the private beta everyone is on the `free` plan and possibly carries the
 * permanent Founding Curator badge (data model §15). The paid Curator Pro plan is
 * out of scope until after beta, so `pro` is never assigned today — but the badge
 * resolution below still handles it correctly, so the day a plan is upgraded the
 * Pro badge appears with zero further wiring.
 *
 * Two distinct concepts, deliberately separate (data model §15):
 *   • users.is_founding_curator — the permanent, immutable social badge.
 *   • plans.plan_type           — the active commercial plan.
 * The badge shown is derived from BOTH: Founding wins (permanent), then Pro.
 */

/** The plan_type values allowed by the plans check constraint (data model §15). */
export type PlanType =
  | 'free'
  | 'founding_curator'
  | 'first_year_curator'
  | 'pro'
  | 'brand'

const PLAN_TYPES: readonly PlanType[] = [
  'free',
  'founding_curator',
  'first_year_curator',
  'pro',
  'brand',
]

function isPlanType(value: string): value is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(value)
}

/** Which badge, if any, a user's plan + founding status resolves to. */
export type PlanBadgeKind = 'founding' | 'pro' | null

export type UserPlan = {
  planType: PlanType
  isFoundingCurator: boolean
  /** The single badge to render for this user (null = no badge). */
  badge: PlanBadgeKind
}

/**
 * Resolve the display badge from a user's founding status and active plan.
 * Founding is permanent and takes precedence over any commercial plan (§15); Pro
 * is shown only for an active `pro`/`first_year_curator` plan (paid tier + first-
 * year grant both carry the Pro badge per §4.1). `free` alone shows nothing.
 */
export function resolvePlanBadge(
  isFoundingCurator: boolean,
  planType: PlanType,
): PlanBadgeKind {
  if (isFoundingCurator) return 'founding'
  if (planType === 'pro' || planType === 'first_year_curator') return 'pro'
  return null
}

/**
 * Read a user's plan + founding status through the authenticated server client.
 * Both `plans` and `users` are readable here (plans has an owner/public SELECT
 * policy; the users row is either the caller's own or an anon-readable public
 * profile). Falls back to `free`/no-badge on any error or missing plan row — a
 * missing plan row should not happen (auto-created at signup) but must never break
 * a profile render. Reads are cheap; callers already fetch the user elsewhere, so
 * this is a targeted second query keyed by id.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createClient()

  const [planRes, userRes] = await Promise.all([
    supabase
      .from('plans')
      .select('plan_type, status')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('is_founding_curator')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (planRes.error) {
    console.error('plans: failed to load plan', { message: planRes.error.message })
  }
  if (userRes.error) {
    console.error('plans: failed to load founding status', {
      message: userRes.error.message,
    })
  }

  const rawType = (planRes.data as { plan_type?: string } | null)?.plan_type
  const status = (planRes.data as { status?: string } | null)?.status
  // Only an active plan grants its badge; an expired/cancelled plan falls back to
  // free (matches the plans.status check — data model §15).
  const planType: PlanType =
    rawType && isPlanType(rawType) && status === 'active' ? rawType : 'free'

  const isFoundingCurator = Boolean(
    (userRes.data as { is_founding_curator?: boolean } | null)
      ?.is_founding_curator,
  )

  return {
    planType,
    isFoundingCurator,
    badge: resolvePlanBadge(isFoundingCurator, planType),
  }
}
