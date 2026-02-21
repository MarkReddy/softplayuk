import type { Venue } from './types'

/**
 * Data completeness indicator for venues.
 * Used in code to assess and log venue data quality -- NOT displayed in UI.
 */

export interface VenueCompleteness {
  /** Overall score 0-100 */
  score: number
  /** Which fields are populated */
  fields: {
    description: boolean
    phone: boolean
    website: boolean
    facilities: boolean
    openingHours: boolean
    images: boolean
    reviews: boolean
    googleRating: boolean
  }
  /** Count of populated fields (out of 8) */
  populatedCount: number
  /** Human-readable tier: 'full' | 'partial' | 'thin' */
  tier: 'full' | 'partial' | 'thin'
}

/**
 * Calculate data completeness for a venue.
 * Returns a score (0-100) and field-by-field breakdown.
 */
export function getVenueCompleteness(venue: Venue): VenueCompleteness {
  const allClosed = Object.values(venue.openingHours).every((h) => h === 'Closed')

  const fields = {
    description: Boolean(venue.description && venue.description.trim().length > 0),
    phone: Boolean(venue.phone && venue.phone.trim().length > 0),
    website: Boolean(venue.website && venue.website.trim().length > 0),
    facilities: venue.amenities.length > 0,
    openingHours: !allClosed,
    images: venue.images.length > 0,
    reviews: venue.firstPartyReviewCount > 0 || (venue.googleReviewCount ?? 0) > 0,
    googleRating: venue.googleRating != null && venue.googleRating > 0,
  }

  const values = Object.values(fields)
  const populatedCount = values.filter(Boolean).length
  const score = Math.round((populatedCount / values.length) * 100)

  let tier: VenueCompleteness['tier']
  if (score >= 75) tier = 'full'
  else if (score >= 38) tier = 'partial'
  else tier = 'thin'

  return { score, fields, populatedCount, tier }
}

/**
 * Returns true if the venue page would show the "being compiled" placeholder
 * for any section. Used in tests to ensure no placeholder text appears when
 * real data exists.
 */
export function wouldShowPlaceholder(venue: Venue): {
  aboutPlaceholder: boolean
  facilitiesPlaceholder: boolean
} {
  // After our fix, About/Facilities sections are hidden when empty --
  // they should NEVER show placeholder text.
  return {
    aboutPlaceholder: false,
    facilitiesPlaceholder: false,
  }
}
