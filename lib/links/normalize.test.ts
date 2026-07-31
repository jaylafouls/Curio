import { describe, it, expect } from 'vitest'
import { normalizeUrl, isSavableUrl } from './normalize'

/**
 * URL canonicalization tests — the invariant that guards the Link dedup model
 * (data model §8): two saves of "the same page" differing only in tracking noise,
 * a trailing slash, www., scheme case, or a fragment MUST collapse to one
 * `url_normalized`, so the canonical `saves_count` / "X people saved this" signal
 * is shared. These are the cases the real second-save dedup relies on.
 */

describe('normalizeUrl — canonicalization', () => {
  it('adds https:// to a scheme-less host', () => {
    expect(normalizeUrl('example.com/path')).toBe('https://example.com/path')
  })

  it('strips a leading www.', () => {
    expect(normalizeUrl('https://www.example.com/a')).toBe(
      'https://example.com/a',
    )
  })

  it('lowercases the host but preserves path case', () => {
    expect(normalizeUrl('https://Example.COM/Path/To')).toBe(
      'https://example.com/Path/To',
    )
  })

  it('drops a bare trailing slash so host and host/ are equal', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('strips a trailing slash on a deeper path so /a/ == /a', () => {
    // Regression: a save of "site/news" and "site/news/" must be ONE canonical
    // Link. Keeping the slash split them and broke the shared saves_count signal
    // (found in real second-save verification against bbc.com/news).
    expect(normalizeUrl('https://example.com/a/')).toBe('https://example.com/a')
    expect(normalizeUrl('https://example.com/a')).toBe(
      normalizeUrl('https://example.com/a/'),
    )
  })

  it('strips a trailing slash before the query too', () => {
    expect(normalizeUrl('https://example.com/news/?id=1')).toBe(
      'https://example.com/news?id=1',
    )
  })

  it('drops the fragment', () => {
    expect(normalizeUrl('https://example.com/a#section-2')).toBe(
      'https://example.com/a',
    )
  })

  it('strips tracking params but keeps identity params', () => {
    expect(
      normalizeUrl(
        'https://example.com/p?utm_source=x&id=42&fbclid=abc&gclid=z',
      ),
    ).toBe('https://example.com/p?id=42')
  })

  it('sorts kept params so order does not create two Links', () => {
    expect(normalizeUrl('https://example.com/p?b=2&a=1')).toBe(
      normalizeUrl('https://example.com/p?a=1&b=2'),
    )
  })

  it('drops the default port, keeps a non-default one', () => {
    expect(normalizeUrl('https://example.com:443/a')).toBe(
      'https://example.com/a',
    )
    expect(normalizeUrl('http://example.com:8080/a')).toBe(
      'http://example.com:8080/a',
    )
  })

  it('collapses the full noise set to one canonical form', () => {
    const a = normalizeUrl(
      'HTTPS://WWW.Example.com/Article/?utm_campaign=spring&ref=twitter#top',
    )
    const b = normalizeUrl('https://example.com/Article')
    expect(a).toBe('https://example.com/Article')
    expect(a).toBe(b)
  })

  it('collapses the exact real-world case that first broke dedup', () => {
    // The two forms a user actually pastes for "the same page".
    expect(normalizeUrl('https://www.bbc.com/news')).toBe(
      normalizeUrl('https://www.bbc.com/news/?utm_source=newsletter'),
    )
  })

  it('rejects non-http(s) and empty inputs', () => {
    expect(normalizeUrl('mailto:x@y.com')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('data:text/html,hi')).toBeNull()
    expect(normalizeUrl('ftp://example.com')).toBeNull()
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('')).toBeNull()
  })

  it('preserves a value-less kept param without an = sign', () => {
    expect(normalizeUrl('https://example.com/p?flag')).toBe(
      'https://example.com/p?flag',
    )
  })
})

describe('isSavableUrl', () => {
  it('is true for http(s) URLs and false otherwise', () => {
    expect(isSavableUrl('example.com')).toBe(true)
    expect(isSavableUrl('https://a.b/c')).toBe(true)
    expect(isSavableUrl('not a url at all with spaces')).toBe(false)
    expect(isSavableUrl('mailto:a@b.com')).toBe(false)
  })
})
