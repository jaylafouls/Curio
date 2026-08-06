import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type {
  NotificationType,
  NotificationTargetType,
} from './emit'

/**
 * Notification READS for the signed-in recipient (/notifications, the bell).
 *
 * Every read goes through the AUTHENTICATED server client, so the
 * notifications_select_recipient RLS policy (auth.uid() = recipient_id) scopes
 * rows to the caller — a user can only ever read their own notifications. No
 * service-role here: reads are the recipient's own rows by policy. Writes
 * (emission, mark-read) live elsewhere.
 *
 * The actor (who followed) is embedded so the list can render "@name followed
 * you" with an avatar linking to their profile. actor_id is ON DELETE SET NULL
 * (0002), so a notification can outlive its actor — the actor embed is nullable
 * and the UI renders a neutral "Someone" fallback rather than breaking.
 *
 * Only the two SHIPPED types are surfaced ('follow' with target user =
 * user-follow, 'follow' with target collection = collection-follow). like /
 * comment / mention have no source feature, so no rows of those types are ever
 * written — the tabs for them are inert "Coming soon" placeholders, fed by
 * nothing.
 */

export type NotificationActor = {
  username: string
  displayName: string
  avatarUrl: string | null
}

export type AppNotification = {
  id: string
  type: NotificationType
  targetType: NotificationTargetType | null
  targetId: string | null
  isRead: boolean
  createdAt: string
  /** Null when the actor account was deleted (actor_id SET NULL). */
  actor: NotificationActor | null
}

type NotificationRow = {
  id: string
  type: NotificationType
  target_type: NotificationTargetType | null
  target_id: string | null
  is_read: boolean
  created_at: string
  actor:
    | { username: string; display_name: string; avatar_url: string | null }
    | { username: string; display_name: string; avatar_url: string | null }[]
    | null
}

const NOTIFICATION_SELECT =
  'id, type, target_type, target_id, is_read, created_at, ' +
  'actor:users!notifications_actor_id_fkey (username, display_name, avatar_url)'

function mapRow(row: NotificationRow): AppNotification {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
  return {
    id: row.id,
    type: row.type,
    targetType: row.target_type,
    targetId: row.target_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    actor: actor
      ? {
          username: actor.username,
          displayName: actor.display_name,
          avatarUrl: actor.avatar_url,
        }
      : null,
  }
}

/**
 * The recipient's notifications, newest first. RLS scopes to the caller; a fresh
 * account with no notifications reads [] and the page shows its empty state (no
 * fake seeding). Capped at `limit` — the feed is reverse-chronological, not
 * paginated this chantier (the list is small during the beta).
 */
export async function getNotifications(
  recipientId: string,
  limit = 50,
): Promise<AppNotification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('notifications: failed to load feed', {
      message: error.message,
    })
    return []
  }

  return ((data ?? []) as unknown as NotificationRow[]).map(mapRow)
}

/**
 * Unread count for the bell badge. `cache()` dedupes across a request so the
 * shell (bell) and a page can both call it without a double round-trip. RLS
 * scopes the count to the caller's own rows; 0 for a fresh account.
 */
export const getUnreadNotificationCount = cache(
  async (recipientId: string): Promise<number> => {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('is_read', false)

    if (error) {
      console.error('notifications: failed to count unread', {
        message: error.message,
      })
      return 0
    }
    return count ?? 0
  },
)
