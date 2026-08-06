import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Notification EMISSION — server-only, service-role, best-effort.
 *
 * The notifications table's RLS lets the recipient SELECT its own rows and
 * UPDATE is_read, but grants NO client INSERT (0005). Writing a notification for
 * another user is therefore a privileged operation that must bypass RLS — same
 * discipline as the consent_logs journal. Routing it through the service-role
 * client keeps the write surface server-only: a client can never forge a
 * notification addressed to someone else.
 *
 * Emission is a SIDE EFFECT of the triggering action (a follow), never part of
 * its atomicity. `emitNotification` therefore swallows its own failure — it
 * logs and returns false, but never throws — so a notification-insert hiccup can
 * never roll back or fail the follow that the user actually performed. The
 * caller ignores the result on the happy path; the boolean exists for tests and
 * for callers that want to assert emission.
 *
 * Self-notifications are dropped at the source (a self-follow is impossible per
 * the follows CHECK, but a collection owner following their own collection is
 * not — and pinging yourself is noise, not signal).
 */

export type NotificationType = 'follow' | 'like' | 'comment' | 'mention'
export type NotificationTargetType = 'user' | 'collection' | 'link'

export type EmitNotificationInput = {
  /** Who receives the notification (the followed user / collection owner). */
  recipientId: string
  /** Who performed the action (the follower). */
  actorId: string
  type: NotificationType
  targetType: NotificationTargetType
  /** The followed user id / followed collection id. */
  targetId: string
}

export async function emitNotification(
  input: EmitNotificationInput,
): Promise<boolean> {
  const { recipientId, actorId, type, targetType, targetId } = input

  // Never notify a user about their own action.
  if (recipientId === actorId) return false

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('notifications').insert({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      target_type: targetType,
      target_id: targetId,
    })
    if (error) {
      console.error('emitNotification: insert failed', {
        type,
        targetType,
        message: error.message,
      })
      return false
    }
    return true
  } catch (err) {
    // createAdminClient throws if the service-role key is absent. A missing key
    // must not take down the follow — log and degrade to "no notification".
    console.error('emitNotification: emission threw', {
      type,
      targetType,
      message: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
