import type { Venue } from '@/lib/types'
import { getBlendedRating } from '@/lib/data'
import { SITE_URL } from '@/lib/site-config'

/**
 * Generates schema.org JSON-LD structured data for a venue page.
 * Uses SportsActivityLocation for soft play / trampoline / adventure venues,
 * falls back to LocalBusiness for others (farms, zoos, etc.).
 * All optional fields are omitted when data is missing.
 */
export function VenueJsonLd({ venue }: { venue: Venue }) {
  const activityTypes = ['soft_play', 'trampoline_park', 'adventure']
  const schemaType = activityTypes.includes(venue.primaryCategory)
    ? 'SportsActivityLocation'
    : 'LocalBusiness'

  const blended = getBlendedRating(venue)
  const totalReviews = (venue.googleReviewCount || 0) + venue.firstPartyReviewCount

  // Price range mapping
  const priceRangeMap: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$' }

  // Build opening hours in schema.org format: "Mo 09:00-17:00"
  const dayAbbr: Record<string, string> = {
    monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
    thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
  }
  const openingHoursSpec: Array<Record<string, string>> = []
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  for (const day of days) {
    const hours = venue.openingHours[day]
    if (hours && hours !== 'Closed') {
      const match = hours.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
      if (match) {
        openingHoursSpec.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${dayAbbr[day] === 'Mo' ? 'Monday' : dayAbbr[day] === 'Tu' ? 'Tuesday' : dayAbbr[day] === 'We' ? 'Wednesday' : dayAbbr[day] === 'Th' ? 'Thursday' : dayAbbr[day] === 'Fr' ? 'Friday' : dayAbbr[day] === 'Sa' ? 'Saturday' : 'Sunday'}`,
          opens: match[1],
          closes: match[2],
        })
      }
    }
  }

  // Build the structured data object, omitting undefined/null fields
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: venue.name,
    url: `${SITE_URL}/venue/${venue.slug}`,
    description: venue.description || venue.shortDescription || undefined,
  }

  // Address
  jsonLd.address = {
    '@type': 'PostalAddress',
    streetAddress: venue.address,
    postalCode: venue.postcode,
    addressLocality: venue.city,
    addressRegion: venue.area || undefined,
    addressCountry: 'GB',
  }

  // Geo coordinates
  if (venue.lat && venue.lng) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.lat,
      longitude: venue.lng,
    }
  }

  // Contact
  if (venue.phone) jsonLd.telephone = venue.phone
  if (venue.website) jsonLd.sameAs = venue.website

  // Image
  if (venue.imageUrl) jsonLd.image = venue.imageUrl

  // Aggregate rating (only if we have reviews)
  if (blended > 0 && totalReviews > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(blended.toFixed(1)),
      bestRating: 5,
      worstRating: 1,
      reviewCount: totalReviews,
    }
  }

  // Price range
  if (venue.priceBand) {
    jsonLd.priceRange = priceRangeMap[venue.priceBand] || '$$'
  }

  // Opening hours
  if (openingHoursSpec.length > 0) {
    jsonLd.openingHoursSpecification = openingHoursSpec
  }

  // Additional properties for SportsActivityLocation
  if (schemaType === 'SportsActivityLocation') {
    jsonLd.sport = 'Indoor Play'
  }

  // Clean out undefined values for a tidy output
  const clean = JSON.parse(JSON.stringify(jsonLd))

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  )
}
