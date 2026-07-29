import { describe, it, expect } from 'vitest'
import {
  buildPerson,
  buildCollectionPage,
  buildArticle,
  buildProduct,
  serializeJsonLd,
} from './json-ld'

/**
 * Unit tests for the JSON-LD builders (chantier SEO part 4). These validate the
 * emitted schema.org shape without needing a real page — the builders are pure.
 */

describe('buildPerson', () => {
  it('emits a minimal valid Person', () => {
    const node = buildPerson({ name: 'Clara Martin', url: 'https://curio.app/en/profile/clara' })
    expect(node).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Clara Martin',
      url: 'https://curio.app/en/profile/clara',
    })
  })

  it('maps username to @-prefixed alternateName and includes optional fields', () => {
    const node = buildPerson({
      name: 'Clara Martin',
      url: 'https://curio.app/en/profile/clara',
      image: 'https://cdn.curio.app/clara.jpg',
      description: 'Travel curator',
      username: 'clara_martin',
      sameAs: ['https://instagram.com/clara'],
    })
    expect(node.alternateName).toBe('@clara_martin')
    expect(node.image).toBe('https://cdn.curio.app/clara.jpg')
    expect(node.sameAs).toEqual(['https://instagram.com/clara'])
  })

  it('omits undefined optional fields entirely (no empty keys)', () => {
    const node = buildPerson({ name: 'X', url: 'https://curio.app/x' })
    expect('image' in node).toBe(false)
    expect('alternateName' in node).toBe(false)
    expect('sameAs' in node).toBe(false)
  })
})

describe('buildCollectionPage', () => {
  it('nests a typed Person author when provided', () => {
    const node = buildCollectionPage({
      name: 'Tokyo by locals',
      url: 'https://curio.app/en/collections/tokyo',
      author: { name: 'Clara', url: 'https://curio.app/en/profile/clara' },
      datePublished: '2026-01-01T00:00:00.000Z',
    })
    expect(node['@type']).toBe('CollectionPage')
    expect(node.author).toEqual({
      '@type': 'Person',
      name: 'Clara',
      url: 'https://curio.app/en/profile/clara',
    })
    expect(node.datePublished).toBe('2026-01-01T00:00:00.000Z')
  })

  it('drops author when absent', () => {
    const node = buildCollectionPage({ name: 'Untitled', url: 'https://curio.app/c/1' })
    expect('author' in node).toBe(false)
  })
})

describe('buildArticle', () => {
  it('emits an Article with headline and optional author', () => {
    const node = buildArticle({
      headline: 'The best coffee in Lisbon',
      url: 'https://curio.app/en/links/lisbon-coffee',
      author: { name: 'Clara' },
    })
    expect(node['@type']).toBe('Article')
    expect(node.headline).toBe('The best coffee in Lisbon')
    expect(node.author).toEqual({ '@type': 'Person', name: 'Clara', url: undefined })
  })
})

describe('buildProduct', () => {
  it('nests Brand and Offer nodes', () => {
    const node = buildProduct({
      name: 'Aeropress',
      url: 'https://curio.app/en/links/aeropress',
      brand: 'Aerobie',
      offers: { price: '39.00', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
    })
    expect(node.brand).toEqual({ '@type': 'Brand', name: 'Aerobie' })
    expect(node.offers).toEqual({
      '@type': 'Offer',
      price: '39.00',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    })
  })

  it('drops offers and brand when absent', () => {
    const node = buildProduct({ name: 'Thing', url: 'https://curio.app/t' })
    expect('offers' in node).toBe(false)
    expect('brand' in node).toBe(false)
  })
})

describe('serializeJsonLd', () => {
  it('escapes < to prevent breaking out of a <script> element', () => {
    const node = buildPerson({ name: '</script><script>alert(1)', url: 'https://curio.app/x' })
    const out = serializeJsonLd(node)
    expect(out).not.toContain('</script>')
    expect(out).toContain('\\u003c/script')
  })

  it('produces parseable JSON', () => {
    const node = buildCollectionPage({ name: 'Tokyo', url: 'https://curio.app/c/tokyo' })
    expect(() => JSON.parse(serializeJsonLd(node).replace(/\\u003c/g, '<'))).not.toThrow()
  })
})
