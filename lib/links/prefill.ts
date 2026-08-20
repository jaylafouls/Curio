// Import from the leaf badge module (not the '@/components/ui' barrel) so this
// pure helper — and its unit tests — don't pull the whole client-component barrel
// (JSX/React) into a plain node context.
import { BADGE_TOPICS, type BadgeTopic } from '@/components/ui/badge'

/**
 * Additive heuristic prefill for the Save Flow (Add-to-Curio metadata pass,
 * Point 2). Two pure, best-effort helpers layered UNDER the strong cross-user
 * inheritance suggestion (§18.6, `suggestInheritedCategory`):
 *
 *   - `topicFromDomain(hostname)` — a static domain → Topic rule table. Only fills
 *     the Topic picker when cross-user inheritance found nothing (inheritance is
 *     the authoritative signal — a real human already filed this exact link; a
 *     domain guess is a weak fallback).
 *   - `tagCandidatesFromMeta(title, description)` — tokenises the fetched title +
 *     description into deduped candidate tags (stop-words removed, capped). These
 *     surface as clickable, UNCHECKED chips under the tags field — never
 *     auto-applied. The user opts in per chip.
 *
 * Both are pure (no I/O, no secrets) so they unit-test like `normalize`/`og` and
 * can run on either the client or the server. Neither ever writes anything: they
 * only produce suggestions the user can accept or ignore.
 */

// ── topicFromDomain — weak domain → Topic fallback ───────────────────────────

/**
 * Registrable-domain → Topic rules. Keyed by the domain WITHOUT the `www.`
 * prefix or scheme (e.g. `booking.com`, `medium.com`). A hostname matches a rule
 * when it equals the key OR is a sub-domain of it (`shop.etsy.com` matches
 * `etsy.com`), so we don't need to enumerate every sub-domain. Kept intentionally
 * small and high-confidence — a wrong guess is worse than no guess because the
 * user then has to notice and correct it. Only Topics in BADGE_TOPICS are used.
 */
const DOMAIN_TOPIC_RULES: ReadonlyArray<readonly [string, BadgeTopic]> = [
  // Travel — booking, maps, guides.
  ['booking.com', 'travel'],
  ['airbnb.com', 'travel'],
  ['tripadvisor.com', 'travel'],
  ['expedia.com', 'travel'],
  ['lonelyplanet.com', 'travel'],
  ['skyscanner.com', 'travel'],
  ['kayak.com', 'travel'],
  ['hotels.com', 'travel'],
  ['maps.google.com', 'travel'],
  ['google.com/maps', 'travel'],

  // Food — recipes, restaurants, guides.
  ['yelp.com', 'food'],
  ['allrecipes.com', 'food'],
  ['seriouseats.com', 'food'],
  ['bonappetit.com', 'food'],
  ['epicurious.com', 'food'],
  ['thekitchn.com', 'food'],
  ['marmiton.org', 'food'],
  ['cuisineaz.com', 'food'],
  ['tasty.co', 'food'],
  ['thefork.com', 'food'],

  // Design — design tooling, galleries, inspiration.
  ['dribbble.com', 'design'],
  ['behance.net', 'design'],
  ['figma.com', 'design'],
  ['awwwards.com', 'design'],
  ['designspiration.com', 'design'],
  ['muzli.com', 'design'],

  // Photography.
  ['unsplash.com', 'photography'],
  ['flickr.com', 'photography'],
  ['500px.com', 'photography'],
  ['pexels.com', 'photography'],

  // Books & reading.
  ['goodreads.com', 'books'],
  ['babelio.com', 'books'],
  ['bookshop.org', 'books'],
  ['liter.club', 'books'],

  // Culture — arts, film, music, museums.
  ['imdb.com', 'culture'],
  ['letterboxd.com', 'culture'],
  ['bandcamp.com', 'culture'],
  ['pitchfork.com', 'culture'],
  ['metmuseum.org', 'culture'],
  ['artsy.net', 'culture'],

  // Style & fashion.
  ['vogue.com', 'style'],
  ['ssense.com', 'style'],
  ['net-a-porter.com', 'style'],
  ['farfetch.com', 'style'],
  ['zalando.com', 'style'],

  // Beauty.
  ['sephora.com', 'beauty'],
  ['sephora.fr', 'beauty'],
  ['byrdie.com', 'beauty'],
  ['glossier.com', 'beauty'],

  // Wellness — health, fitness, mindfulness.
  ['headspace.com', 'wellness'],
  ['calm.com', 'wellness'],
  ['myfitnesspal.com', 'wellness'],
  ['strava.com', 'wellness'],

  // Ideas — long-form, essays, knowledge.
  ['medium.com', 'ideas'],
  ['substack.com', 'ideas'],
  ['wikipedia.org', 'ideas'],
  ['ted.com', 'ideas'],
  ['aeon.co', 'ideas'],
  ['nautil.us', 'ideas'],
]

function isBadgeTopic(id: string): id is BadgeTopic {
  return (BADGE_TOPICS as readonly string[]).includes(id)
}

/**
 * A weak Topic guess from a hostname, or null when no rule matches. A rule key
 * matches when the hostname equals it or is a sub-domain (`shop.etsy.com` →
 * `etsy.com`). A leading `www.` on the input is ignored. Rule keys that embed a
 * path (`google.com/maps`) are compared against `host + pathname` so a bare
 * `google.com` does NOT wrongly match the maps rule.
 *
 * `input` may be a bare hostname (`booking.com`), a `host/path`, or a full URL —
 * we parse defensively and fall back to string handling so a caller can pass
 * either the normalized URL or just its host.
 */
export function topicFromDomain(input: string): BadgeTopic | null {
  if (typeof input !== 'string' || input.trim() === '') return null

  let host = ''
  let pathname = ''
  const trimmed = input.trim()
  try {
    // Accept a full URL or a scheme-less host/path.
    const u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    host = u.hostname.toLowerCase()
    pathname = u.pathname.toLowerCase().replace(/\/+$/, '')
  } catch {
    // Not URL-shaped — treat the whole thing as a host, dropping any path.
    const [rawHost, ...rest] = trimmed.toLowerCase().split('/')
    host = rawHost
    pathname = rest.length ? `/${rest.join('/')}`.replace(/\/+$/, '') : ''
  }

  if (host.startsWith('www.')) host = host.slice(4)
  if (!host) return null

  const hostPath = `${host}${pathname}`

  for (const [key, topic] of DOMAIN_TOPIC_RULES) {
    if (!isBadgeTopic(topic)) continue
    if (key.includes('/')) {
      // Path-scoped rule (e.g. "google.com/maps"): the host+path must start with
      // it (exact page or a deeper path under it).
      if (hostPath === key || hostPath.startsWith(`${key}/`)) return topic
      continue
    }
    // Host-only rule: exact host or a sub-domain of it.
    if (host === key || host.endsWith(`.${key}`)) return topic
  }
  return null
}

// ── tagCandidatesFromMeta — unchecked suggested tags from fetched text ────────

const MAX_TAG_CANDIDATES = 6
const MIN_TOKEN_LENGTH = 3
const MAX_TOKEN_LENGTH = 24 // mirrors the free-tag input cap (40) with headroom

/**
 * Stop-words dropped from tag candidates — the highest-frequency English + French
 * function words plus a few web-boilerplate terms ("home", "www", "https") that
 * add no signal. Lowercased; matched case-insensitively.
 */
const STOP_WORDS = new Set<string>([
  // English
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man',
  'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let',
  'put', 'say', 'she', 'too', 'use', 'that', 'with', 'this', 'from', 'they',
  'have', 'more', 'will', 'your', 'what', 'when', 'were', 'been', 'them', 'then',
  'than', 'into', 'just', 'over', 'also', 'here', 'some', 'such', 'only', 'very',
  'much', 'most', 'about', 'would', 'there', 'their', 'which', 'these', 'other',
  'home', 'page', 'site', 'blog', 'post', 'read', 'best', 'guide', 'www', 'com',
  'http', 'https', 'html',
  // French
  'les', 'des', 'une', 'est', 'pour', 'dans', 'avec', 'sur', 'pas', 'plus',
  'par', 'vous', 'nous', 'que', 'qui', 'son', 'ses', 'mais', 'tout', 'tous',
  'aux', 'cette', 'comme', 'sans', 'sous', 'leur', 'leurs', 'être', 'avoir',
  'fait', 'faire', 'entre', 'votre', 'notre', 'accueil',
])

/**
 * Deduped candidate tags tokenised from the fetched title + description. Purely a
 * SUGGESTION source: the caller renders these as unchecked chips the user may
 * click to add — nothing here is ever auto-applied to the save.
 *
 * Tokenisation: split on non-letter/digit runs (Unicode-aware, so accented
 * French words survive), lowercase, drop stop-words, drop tokens shorter than
 * MIN_TOKEN_LENGTH or longer than MAX_TOKEN_LENGTH, drop pure numbers, dedupe
 * case-insensitively preserving first-seen order (title before description, so
 * the most salient words lead), cap at MAX_TAG_CANDIDATES.
 */
export function tagCandidatesFromMeta(
  title: string | null | undefined,
  description: string | null | undefined,
): string[] {
  const text = [title ?? '', description ?? ''].join(' ')
  if (!text.trim()) return []

  // Split on any run that is NOT a Unicode letter or digit. Keeps "l'été" apart
  // into "l"/"été" (the "l" is dropped by length), and "co-op" into "co"/"op".
  const tokens = text.split(/[^\p{L}\p{N}]+/u)

  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tokens) {
    const token = raw.toLowerCase()
    if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) continue
    if (/^\d+$/.test(token)) continue // pure numbers carry no tag signal
    if (STOP_WORDS.has(token)) continue
    if (seen.has(token)) continue
    seen.add(token)
    out.push(token)
    if (out.length >= MAX_TAG_CANDIDATES) break
  }
  return out
}
