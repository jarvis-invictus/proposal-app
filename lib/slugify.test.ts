import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

// slugify()'s own comment: "this slug is the entire access control for a public proposal link" —
// the suffix has to actually be present, random-looking, and different every call, not just
// "some string got appended."
const SLUG_SHAPE = /^[a-z0-9-]+-[0-9a-f]{8}$/

describe('slugify', () => {
  it('lowercases and hyphenates the title, with an 8-hex-char random suffix', () => {
    const slug = slugify('My Awesome Proposal')
    expect(slug).toMatch(SLUG_SHAPE)
    expect(slug.startsWith('my-awesome-proposal-')).toBe(true)
  })

  it('strips non-alphanumeric characters', () => {
    const slug = slugify("Client's Q4 Proposal!! (v2)")
    expect(slug).toMatch(SLUG_SHAPE)
    expect(slug).not.toMatch(/['!()]/)
  })

  it('falls back to "proposal" for an empty or whitespace-only title', () => {
    expect(slugify('')).toMatch(/^proposal-[0-9a-f]{8}$/)
    expect(slugify('   ')).toMatch(/^proposal-[0-9a-f]{8}$/)
  })

  it('produces a different, non-guessable suffix on every call for the same title', () => {
    const slugs = new Set(Array.from({ length: 20 }, () => slugify('Same Title')))
    // 20 independent crypto.randomUUID() draws colliding on their first 8 hex chars is
    // astronomically unlikely — a failure here would mean the suffix isn't actually random.
    expect(slugs.size).toBe(20)
  })

  it('caps the slug base length so an extremely long title does not produce an unbounded slug', () => {
    const slug = slugify('a'.repeat(500))
    // 60-char cap (per the function's own comment) + '-' + 8 hex chars.
    expect(slug.length).toBeLessThanOrEqual(60 + 1 + 8)
  })

  it('never leaves a leading or trailing hyphen from the title portion', () => {
    const slug = slugify('--Leading and trailing--')
    const base = slug.slice(0, slug.length - 9) // strip the trailing "-" + 8 hex chars
    expect(slug.startsWith('-')).toBe(false)
    expect(base.endsWith('-')).toBe(false)
  })
})
