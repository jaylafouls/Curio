'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Notification WRITE actions for the recipient (mark-as-read).
 *
 * These run through the caller's AUTHENTICATED session, so the
 * notifications_update_recipient RLS policy (auth.uid() = recipient_id, with the
 * same check) guarantees a user can only ever mark THEIR OWN notifications read
 * — no service-role needed, no cross-user surface. The user id is re-derived
 * from the session, never trusted from the client.
 *
 * Emission (writing a notification FOR someone) is the privileged path and lives
 * in lib/notifications/emit.ts (service-role). Reading lives in ./data.ts.
 */

type ActionResult = { ok: true } | { ok: false; error: 'unauthenticated' | 'server' }

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Mark every unread notification for the signed-in user as read — called when
 * the recipient opens /notifications, so the bell badge clears on view. Scoped
 * to is_read = false so it touches only the rows that need it. Idempotent: a
 * second call with nothing unread is a no-op.
 */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('markAllNotificationsRead: update failed', {
      message: error.message,
    })
    return { ok: false, error: 'server' }
  }
  return { ok: true }
}
