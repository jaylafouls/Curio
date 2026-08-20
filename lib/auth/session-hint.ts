/**
 * hasLikelySession — a cheap, synchronous, client-side guess at whether the
 * visitor is signed in, read from the browser cookie jar.
 *
 * This is NOT an auth check (it is trivially spoofable and never gates data —
 * every real read still re-derives the caller from the session server-side). Its
 * only job is a UX one: on the cookie-free ISR pages (/collections/[id] etc.) the
 * connected chrome can only be resolved AFTER hydration, via a Server Action
 * round-trip. Until that resolves, a signed-in user who navigated in from within
 * the app would otherwise see a blank, chrome-less flash. This hint lets the
 * session-gated shell paint a skeleton frame immediately for a *likely* session,
 * while an anonymous visitor or crawler (no auth cookie) gets nothing extra — so
 * the SEO/cache guarantee holds: the server render is untouched and only a
 * cookie-carrying browser ever paints the skeleton.
 *
 * Supabase (@supabase/ssr) stores the auth session in a cookie named
 * `sb-<project-ref>-auth-token` (chunked as `...-auth-token.0` when large). We
 * match on the `sb-`/`-auth-token` shape so no project ref needs hardcoding and
 * a ref change never silently breaks the hint.
 */
export function hasLikelySession(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some((c) => {
      const name = c.split('=')[0]?.trim() ?? ''
      return name.startsWith('sb-') && name.includes('-auth-token')
    })
}
