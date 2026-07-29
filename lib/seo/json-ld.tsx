import type { ReactElement } from 'react'

/**
 * JSON-LD structured data (chantier SEO part 4).
 *
 * Reusable schema.org builders + a renderer, ready to be dropped into the public
 * pages that later chantiers will build (profiles, public collections, links).
 * Kept as pure builder functions (fully unit-testable, no page required) plus a
 * thin <JsonLd> component that serialises one into a script tag.
 *
 * Design notes:
 *  - Builders return plain JSON-LD objects so they can be tested by value.
 *  - `undefined` fields are stripped so optional data never emits empty keys.
 *  - Serialisation escapes `<` to avoid breaking out of the <script> element
 *    (the standard XSS guard for inline JSON-LD).
 */

/** Minimal shape shared by every node we emit: always carries @context/@type. */
type JsonLdNode = Record<string, unknown> & {
  '@context': 'https://schema.org'
  '@type': string
}

// ── Builder inputs ─────────────────────────────────────────────────────────

export type PersonInput = {
  /** Public profile display name. */
  name: string
  /** Absolute canonical URL of the profile page. */
  url: string
  /** Absolute avatar image URL, if any. */
  image?: string
  /** Short bio / description. */
  description?: string
  /** Handle without the @, e.g. "clara_martin". */
  username?: string
  /** Absolute URLs of the person's other profiles / site (sameAs). */
  sameAs?: string[]
}

export type CollectionPageInput = {
  /** Collection title. */
  name: string
  /** Absolute canonical URL of the collection page. */
  url: string
  /** Collection description, if any. */
  description?: string
  /** Absolute cover image URL, if any. */
  image?: string
  /** The collection's author/curator. */
  author?: { name: string; url: string }
  /** ISO date strings for freshness signals. */
  datePublished?: string
  dateModified?: string
}

export type ArticleInput = {
  /** Link/article title. */
  headline: string
  /** Absolute canonical URL. */
  url: string
  description?: string
  /** Absolute image URL, if any. */
  image?: string
  author?: { name: string; url?: string }
  datePublished?: string
  dateModified?: string
}

export type ProductInput = {
  /** Product name. */
  name: string
  /** Absolute canonical URL. */
  url: string
  description?: string
  /** Absolute image URL, if any. */
  image?: string
  brand?: string
  offers?: {
    price: string
    priceCurrency: string
    /** schema.org availability URL, e.g. https://schema.org/InStock. */
    availability?: string
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Recursively drop keys whose value is undefined (never emit empty fields). */
function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => pruneUndefined(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = pruneUndefined(v)
    }
    return out as T
  }
  return value
}

// ── Builders ───────────────────────────────────────────────────────────────

/** schema.org/Person — public curator profiles (spec §8.10). */
export function buildPerson(input: PersonInput): JsonLdNode {
  return pruneUndefined({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    url: input.url,
    image: input.image,
    description: input.description,
    alternateName: input.username ? `@${input.username}` : undefined,
    sameAs: input.sameAs,
  })
}

/** schema.org/CollectionPage — public collections. */
export function buildCollectionPage(input: CollectionPageInput): JsonLdNode {
  return pruneUndefined({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url,
    description: input.description,
    image: input.image,
    author: input.author
      ? { '@type': 'Person', name: input.author.name, url: input.author.url }
      : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
  })
}

/** schema.org/Article — editorial-style links. */
export function buildArticle(input: ArticleInput): JsonLdNode {
  return pruneUndefined({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    url: input.url,
    description: input.description,
    image: input.image,
    author: input.author
      ? { '@type': 'Person', name: input.author.name, url: input.author.url }
      : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
  })
}

/** schema.org/Product — product links (e.g. shoppable saves). */
export function buildProduct(input: ProductInput): JsonLdNode {
  return pruneUndefined({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    url: input.url,
    description: input.description,
    image: input.image,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    offers: input.offers
      ? {
          '@type': 'Offer',
          price: input.offers.price,
          priceCurrency: input.offers.priceCurrency,
          availability: input.offers.availability,
        }
      : undefined,
  })
}

// ── Renderer ───────────────────────────────────────────────────────────────

/**
 * Serialise a JSON-LD node for safe inline embedding. Escapes `<` so a value
 * containing "</script>" cannot terminate the script element early.
 */
export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/</g, '\\u003c')
}

/**
 * Emits one JSON-LD node as a <script type="application/ld+json">. Drop into any
 * Server Component:  <JsonLd data={buildPerson({...})} />
 */
export function JsonLd({ data }: { data: JsonLdNode }): ReactElement {
  return (
    <script
      type="application/ld+json"
      // Content is our own serialised JSON with `<` escaped — safe to inject.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
