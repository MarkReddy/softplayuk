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

// ─── Slug Resolution Tests (unit-level) ─────────────────────

describe('slug resolution consistency', () => {
  it('hydrateVenue preserves the slug exactly as stored in DB', () => {
    // This validates that the hydrator does not modify the slug
    const { hydrateVenue } = require('../db')
    const row = {
      id: 999,
      name: 'Test Venue',
      slug: 'test-venue-city-abc1',
      city: 'City',
      county: 'County',
      description: 'desc',
      postcode: 'AB1 2CD',
      address_line1: '123 St',
      address_line2: null,
      lat: 51.5,
      lng: -0.1,
      phone: null,
      website: null,
      category: 'soft_play',
      age_range: '0-12',
      price_range: 'mid',
      status: 'active',
      has_cafe: false,
      has_parking: false,
      has_party_rooms: false,
      is_sen_friendly: false,
      has_baby_area: false,
      has_outdoor: false,
      google_rating: null,
      google_review_count: 0,
      first_party_rating: 0,
      first_party_review_count: 0,
      cleanliness_score: 0,
      google_place_id: null,
      last_google_sync: null,
      updated_at: '2026-01-01',
      created_at: '2026-01-01',
      image_url: null,
    }

    const defaultHours = {
      monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed',
      thursday: 'Closed', friday: 'Closed', saturday: 'Closed', sunday: 'Closed',
    }

    const venue = hydrateVenue(row, [], defaultHours, [])
    expect(venue.slug).toBe('test-venue-city-abc1')
    expect(venue.id).toBe('999')
    expect(venue.name).toBe('Test Venue')
  })
})
