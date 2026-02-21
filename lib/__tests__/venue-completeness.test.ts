import { describe, it, expect } from 'vitest'
import { getVenueCompleteness, wouldShowPlaceholder } from '../venue-completeness'
import type { Venue } from '../types'

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: '1',
    name: 'Test Venue',
    slug: 'test-venue',
    description: '',
    shortDescription: '',
    address: '123 Test St',
    postcode: 'AB1 2CD',
    city: 'TestCity',
    area: 'TestCounty',
    lat: 51.5,
    lng: -0.1,
    phone: '',
    website: '',
    imageUrl: '/images/venue-1.jpg',
    images: [],
    primaryCategory: 'soft_play',
    ageRange: { min: 0, max: 12 },
    priceBand: 2,
    amenities: [],
    openingHours: {
      monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed',
      thursday: 'Closed', friday: 'Closed', saturday: 'Closed', sunday: 'Closed',
    },
    senFriendly: false,
    partyRooms: false,
    verified: true,
    featured: false,
    googleRating: undefined,
    googleReviewCount: 0,
    firstPartyRating: 0,
    firstPartyReviewCount: 0,
    cleanlinessScore: 0,
    sourcePriority: 'manual',
    sources: [],
    lastRefreshedAt: '2026-01-01',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

// ─── Data Completeness Tests ────────────────────────────────

describe('getVenueCompleteness', () => {
  it('returns tier "thin" for a venue with no enrichment data', () => {
    const venue = makeVenue()
    const result = getVenueCompleteness(venue)

    expect(result.tier).toBe('thin')
    expect(result.score).toBeLessThan(38)
    expect(result.fields.description).toBe(false)
    expect(result.fields.facilities).toBe(false)
    expect(result.fields.openingHours).toBe(false)
    expect(result.fields.reviews).toBe(false)
  })

  it('returns tier "full" for a fully enriched venue', () => {
    const venue = makeVenue({
      description: 'A great soft play centre with tons of fun.',
      phone: '01234 567890',
      website: 'https://example.com',
      amenities: [{ id: 'cafe', name: 'Cafe', icon: 'coffee' }],
      openingHours: {
        monday: '09:00 - 17:00', tuesday: '09:00 - 17:00', wednesday: '09:00 - 17:00',
        thursday: '09:00 - 17:00', friday: '09:00 - 17:00', saturday: '10:00 - 18:00', sunday: '10:00 - 16:00',
      },
      images: [{ url: '/img.jpg', source: 'manual' }],
      firstPartyReviewCount: 5,
      googleRating: 4.5,
    })
    const result = getVenueCompleteness(venue)

    expect(result.tier).toBe('full')
    expect(result.score).toBe(100)
    expect(result.populatedCount).toBe(8)
  })

  it('returns tier "partial" for a venue with some data', () => {
    const venue = makeVenue({
      description: 'A nice venue.',
      googleRating: 4.2,
      googleReviewCount: 30,
    })
    const result = getVenueCompleteness(venue)

    expect(result.tier).toBe('partial')
    expect(result.fields.description).toBe(true)
    expect(result.fields.googleRating).toBe(true)
    expect(result.fields.reviews).toBe(true)
    expect(result.fields.facilities).toBe(false)
  })

  it('counts Google reviews as "has reviews"', () => {
    const venue = makeVenue({
      googleReviewCount: 100,
      firstPartyReviewCount: 0,
    })
    const result = getVenueCompleteness(venue)
    expect(result.fields.reviews).toBe(true)
  })

  it('treats whitespace-only description as empty', () => {
    const venue = makeVenue({ description: '   ' })
    const result = getVenueCompleteness(venue)
    expect(result.fields.description).toBe(false)
  })
})

// ─── Placeholder Detection Tests ────────────────────────────

describe('wouldShowPlaceholder', () => {
  it('never shows About placeholder for venue WITH description', () => {
    const venue = makeVenue({ description: 'A real description.' })
    const { aboutPlaceholder } = wouldShowPlaceholder(venue)
    expect(aboutPlaceholder).toBe(false)
  })

  it('never shows About placeholder for venue WITHOUT description (section is hidden)', () => {
    const venue = makeVenue({ description: '' })
    const { aboutPlaceholder } = wouldShowPlaceholder(venue)
    expect(aboutPlaceholder).toBe(false)
  })

  it('never shows Facilities placeholder for venue WITH facilities', () => {
    const venue = makeVenue({
      amenities: [{ id: 'cafe', name: 'Cafe', icon: 'coffee' }],
    })
    const { facilitiesPlaceholder } = wouldShowPlaceholder(venue)
    expect(facilitiesPlaceholder).toBe(false)
  })

  it('never shows Facilities placeholder for venue WITHOUT facilities (section is hidden)', () => {
    const venue = makeVenue({ amenities: [] })
    const { facilitiesPlaceholder } = wouldShowPlaceholder(venue)
    expect(facilitiesPlaceholder).toBe(false)
  })
})

// ─── Edge Cases ─────────────────────────────────────────────

describe('edge cases', () => {
  it('handles venue with null googleRating', () => {
    const venue = makeVenue({ googleRating: undefined, googleReviewCount: 0 })
    const result = getVenueCompleteness(venue)
    expect(result.fields.googleRating).toBe(false)
    expect(result.fields.reviews).toBe(false)
  })

  it('handles venue with zero googleRating', () => {
    const venue = makeVenue({ googleRating: 0, googleReviewCount: 0 })
    const result = getVenueCompleteness(venue)
    expect(result.fields.googleRating).toBe(false)
  })

  it('handles venue with only first-party reviews', () => {
    const venue = makeVenue({ firstPartyReviewCount: 3, googleReviewCount: 0 })
    const result = getVenueCompleteness(venue)
    expect(result.fields.reviews).toBe(true)
  })

  it('score is always between 0 and 100', () => {
    const thin = makeVenue()
    const full = makeVenue({
      description: 'desc', phone: '01234', website: 'https://x.com',
      amenities: [{ id: 'a', name: 'A', icon: 'a' }],
      openingHours: { monday: '9-5', tuesday: '9-5', wednesday: '9-5', thursday: '9-5', friday: '9-5', saturday: '9-5', sunday: '9-5' },
      images: [{ url: '/x.jpg', source: 'manual' }],
      firstPartyReviewCount: 1, googleRating: 4.0,
    })
    expect(getVenueCompleteness(thin).score).toBeGreaterThanOrEqual(0)
    expect(getVenueCompleteness(thin).score).toBeLessThanOrEqual(100)
    expect(getVenueCompleteness(full).score).toBeGreaterThanOrEqual(0)
    expect(getVenueCompleteness(full).score).toBeLessThanOrEqual(100)
  })
})
