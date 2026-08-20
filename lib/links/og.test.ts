import { describe, it, expect } from 'vitest'
import { faviconUrl } from './og'

/**
 * Favicon extraction tests (Add-to-Curio metadata pass, point 1). faviconUrl
 * scans <link rel="...icon..."> tags, prefers a declared icon over
 * apple-touch-icon, resolves the href absolute against the page URL, falls back
 * to <origin>/favicon.ico when none is declared, and only trusts http(s).
 */

const base = new URL('https://example.com/some/page')

describe('faviconUrl — extraction + resolution', () => {
  it('reads a rel="icon" href and resolves it absolute (root-relative)', () => {
    const html = '<head><link rel="icon" href="/favicon-32.png"></head>'
    expect(faviconUrl(html, base)).toBe('https://example.com/favicon-32.png')
  })

  it('resolves a path-relative href against the page URL', () => {
    const html = '<head><link rel="icon" href="icon.png"></head>'
    expect(faviconUrl(html, base)).toBe('https://example.com/some/icon.png')
  })

  it('matches rel/href in either attribute order', () => {
    const html = '<head><link href="/a.ico" rel="shortcut icon"></head>'
    expect(faviconUrl(html, base)).toBe('https://example.com/a.ico')
  })

  it('prefers a declared icon over apple-touch-icon', () => {
    const html =
      '<head>' +
      '<link rel="apple-touch-icon" href="/apple.png">' +
      '<link rel="icon" href="/real.png">' +
      '</head>'
    expect(faviconUrl(html, base)).toBe('https://example.com/real.png')
  })

  it('falls back to apple-touch-icon when no plain icon is declared', () => {
    const html = '<head><link rel="apple-touch-icon" href="/apple.png"></head>'
    expect(faviconUrl(html, base)).toBe('https://example.com/apple.png')
  })

  it('falls back to <origin>/favicon.ico when nothing is declared', () => {
    expect(faviconUrl('<head></head>', base)).toBe(
      'https://example.com/favicon.ico',
    )
  })

  it('keeps an absolute cross-origin icon URL as-is', () => {
    const html = '<head><link rel="icon" href="https://cdn.example.net/i.png"></head>'
    expect(faviconUrl(html, base)).toBe('https://cdn.example.net/i.png')
  })

  it('resolves a protocol-relative icon href', () => {
    const html = '<head><link rel="icon" href="//cdn.example.net/i.png"></head>'
    expect(faviconUrl(html, base)).toBe('https://cdn.example.net/i.png')
  })

  it('rejects a non-http(s) icon (data: URI) rather than trusting it', () => {
    const html =
      '<head><link rel="icon" href="data:image/png;base64,AAAA"></head>'
    // data: is dropped; there is no other declared icon, so it falls back to
    // the /favicon.ico guess (a valid http(s) URL).
    expect(faviconUrl(html, base)).toBe('https://example.com/favicon.ico')
  })

  it('ignores non-icon <link> tags (stylesheet, preconnect)', () => {
    const html =
      '<head>' +
      '<link rel="stylesheet" href="/app.css">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com">' +
      '</head>'
    // No icon declared → the /favicon.ico fallback.
    expect(faviconUrl(html, base)).toBe('https://example.com/favicon.ico')
  })
})
