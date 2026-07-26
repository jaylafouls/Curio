import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabaseEnv } from './env'

/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 *
 * Reads/writes auth cookies via next/headers. In a pure Server Component the
 * cookie store is read-only, so the `setAll` writes are wrapped: they succeed
 * from Route Handlers / Server Actions and are safely ignored otherwise (the
 * middleware refreshes the session cookie in that case — added in the Auth
 * chantier).
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: {
          name: string
          value: string
          options?: Record<string, unknown>
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by middleware once auth is wired.
        }
      },
    },
  })
}
