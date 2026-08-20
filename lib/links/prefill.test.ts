import { describe, it, expect } from 'vitest'
import { topicFromDomain, tagCandidatesFromMeta } from './prefill'

/**
 * Prefill heuristics tests (Add-to-Curio metadata pass, Point 2). These pure
 * helpers back the WEAK, additive layer under cross-user inheritance:
 *   - topicFromDomain: a domain → Topic rule table (fallback only).
 *   - tagCandidatesFromMeta: tokenised, stop-word-filtered, deduped, capped tag
 *     candidates surfaced as unchecked chips.
 */

describe('topicFromDomain — domain → Topic rules', () => {
  it('matches an exact registrable domain', () => {
    expect(topicFromDomain('booking.com')).toBe('travel')
    expect(topicFromDomain('goodreads.com')).toBe('books')
    expect(topicFromDomain('medium.com')).toBe('ideas')
  })

  it('ignores a leading www.', () => {
    expect(topicFromDomain('www.dribbble.com')).toBe('design')
  })

  it('matches a sub-domain of a rule domain', () => {
    expect(topicFromDomain('shop.sephora.com')).toBe('beauty')
    expect(topicFromDomain('blog.medium.com')).toBe('ideas')
  })

  it('accepts a full URL, not just a bare host', () => {
    expect(topicFromDomain('https://www.yelp.com/biz/some-place')).toBe('food')
  })

  it('honours a path-scoped rule without matching the bare host', () => {
    expect(topicFromDomain('https://google.com/maps/place/x')).toBe('travel')
    // A non-maps google.com page must NOT inherit the maps rule.
    expect(topicFromDomain('https://google.com/search?q=x')).toBeNull()
  })

  it('matches the maps sub-domain rule', () => {
    expect(topicFromDomain('https://maps.google.com/?q=paris')).toBe('travel')
  })

  it('returns null for an unknown domain', () => {
    expect(topicFromDomain('example.com')).toBeNull()
    expect(topicFromDomain('some-random-blog.net')).toBeNull()
  })

  it('does NOT match on a partial/suffix collision', () => {
    // "notbooking.com" ends with "booking.com" as a STRING but is not a
    // sub-domain of it — the "." boundary must be respected.
    expect(topicFromDomain('notbooking.com')).toBeNull()
  })

  it('returns null for empty / junk input', () => {
    expect(topicFromDomain('')).toBeNull()
    expect(topicFromDomain('   ')).toBeNull()
    // @ts-expect-error — guarding the non-string path.
    expect(topicFromDomain(null)).toBeNull()
  })
})

describe('tagCandidatesFromMeta — tokenise + filter + dedupe + cap', () => {
  it('tokenises title and description into lowercase candidates', () => {
    const out = tagCandidatesFromMeta('Kyoto Temple Guide', 'Ancient shrines')
    expect(out).toEqual(['kyoto', 'temple', 'ancient', 'shrines'])
  })

  it('drops stop-words (EN + FR)', () => {
    const out = tagCandidatesFromMeta(
      'The best guide for the city',
      'les plus beaux endroits dans la ville',
    )
    // "the"/"best"/"for"/"guide"/"les"/"plus"/"dans" are stop-words; content survives.
    expect(out).toContain('city')
    expect(out).toContain('beaux')
    expect(out).toContain('endroits')
    expect(out).toContain('ville')
    expect(out).not.toContain('the')
    expect(out).not.toContain('guide')
    expect(out).not.toContain('les')
    expect(out).not.toContain('dans')
  })

  it('preserves accented French words', () => {
    const out = tagCandidatesFromMeta('Recette d’été', 'Cuisine méditerranéenne')
    expect(out).toContain('été')
    expect(out).toContain('méditerranéenne')
  })

  it('dedupes case-insensitively, keeping first-seen order', () => {
    const out = tagCandidatesFromMeta('Design Design DESIGN', 'design systems')
    expect(out).toEqual(['design', 'systems'])
  })

  it('drops tokens shorter than 3 chars and pure numbers', () => {
    const out = tagCandidatesFromMeta('A 10 top tips 2024', 'go run')
    expect(out).not.toContain('a')
    expect(out).not.toContain('10')
    expect(out).not.toContain('2024')
    expect(out).not.toContain('go')
    expect(out).toContain('top')
    expect(out).toContain('tips')
    expect(out).toContain('run')
  })

  it('caps at 6 candidates', () => {
    const out = tagCandidatesFromMeta(
      'alpha bravo charlie delta echo foxtrot golf hotel',
      '',
    )
    expect(out).toHaveLength(6)
    expect(out).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'])
  })

  it('title tokens lead description tokens', () => {
    const out = tagCandidatesFromMeta('zeta', 'apple banana')
    expect(out[0]).toBe('zeta')
  })

  it('returns an empty array for null / empty inputs', () => {
    expect(tagCandidatesFromMeta(null, null)).toEqual([])
    expect(tagCandidatesFromMeta('', '')).toEqual([])
    expect(tagCandidatesFromMeta('   ', undefined)).toEqual([])
  })
})
