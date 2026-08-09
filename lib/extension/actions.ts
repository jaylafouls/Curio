'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  mintExtensionToken,
  revokeExtensionToken,
} from './token'

/**
 * Extension-token Server Actions (Phase 5 chantier 5, Decisions Log §17).
 *
 * The /settings "Connect the Chrome extension" section calls these. Both run
 * under the authenticated session and re-derive the userId from it (never trust
 * a client-passed id), then delegate to the service-role token module.
 *
 * mintExtensionToken returns the RAW token exactly once — it flows through this
 * action to the client so the user can copy it into the extension, then it is
 * never retrievable again (only its hash is stored). Result shape mirrors the
 * rest of the app: `{ ok: true, ... }` | `{ ok: false, error: code }`.
 */

type Err = 'unauthenticated' | 'invalid' | 'server'
type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: Err }

const LABEL_MAX = 80

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Mint a new extension token for the signed-in user. Returns the raw token ONCE
 * (the client shows it, then it is gone). The optional label lets the user tell
 * tokens apart ("Chrome — laptop").
 */
export async function createExtensionToken(
  label?: string | null,
): Promise<Result<{ token: string; id: string }>> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }

  const cleanLabel =
    typeof label === 'string' && label.trim().length > 0
      ? label.trim().slice(0, LABEL_MAX)
      : null

  const minted = await mintExtensionToken(userId, cleanLabel)
  if (!minted) return { ok: false, error: 'server' }

  revalidatePath('/[locale]/settings', 'page')
  return { ok: true, token: minted.token, id: minted.id }
}

/**
 * Revoke one of the signed-in user's extension tokens. Scoped by userId inside
 * revokeExtensionToken so a user can only revoke their own token even though the
 * write is service-role.
 */
export async function revokeExtensionTokenAction(
  tokenId: string,
): Promise<Result> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'unauthenticated' }
  if (!tokenId || typeof tokenId !== 'string') {
    return { ok: false, error: 'invalid' }
  }

  const revoked = await revokeExtensionToken(userId, tokenId)
  if (!revoked) return { ok: false, error: 'server' }

  revalidatePath('/[locale]/settings', 'page')
  return { ok: true }
}
