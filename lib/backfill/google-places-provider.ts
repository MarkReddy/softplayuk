import type { BackfillProvider, DiscoveredVenue } from './types'

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY env var is not set')
  return key
}

/**
 * Google Places API (legacy Nearby Search + Place Details).
 * Handles pagination via nextPageToken (up to 60 results per search).
 */
export class GooglePlacesProvider implements BackfillProvider {
  name = 'google_places'

  async searchArea(lat: number, lng: number, radiusMetres: number): Promise<DiscoveredVenue[]> {
    const key = getApiKey()
    const venues: DiscoveredVenue[] = []
    let nextPageToken: string | undefined

    // Search both "soft play" and "indoor play centre"
    for (const keyword of ['soft play', 'indoor play centre', 'childrens play centre']) {
      nextPageToken = undefined
      let page = 0

      do {
        const params = new URLSearchParams({
          location: `${lat},${lng}`,
          radius: String(Math.min(radiusMetres, 50000)),
          keyword,
          type: 'establishment',
          key,
        })
        if (nextPageToken) {
          params.set('pagetoken', nextPageToken)
        }

        const res = await fetch(`${PLACES_BASE}/nearbysearch/json?${params}`)
        const data = await res.json()

        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
          for (const place of data.results || []) {
            // Deduplicate within this search
            if (!venues.some((v) => v.externalId === place.place_id)) {
              venues.push(mapNearbyResult(place))
            }
          }
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          // Rate limited -- stop this keyword
          break
        }

        nextPageToken = data.next_page_token
        page++

        // Google requires a short delay before using nextPageToken
        if (nextPageToken) {
          await new Promise((r) => setTimeout(r, 2200))
        }
      } while (nextPageToken && page < 3)
    }

    return venues
  }

  async getDetails(placeId: string): Promise<DiscoveredVenue | null> {
    const key = getApiKey()
    const fields = [
      'place_id', 'name', 'formatted_address', 'geometry',
      'formatted_phone_number', 'website', 'rating', 'user_ratings_total',
      'price_level', 'opening_hours', 'photos', 'types',
      'address_components', 'editorial_summary',
    ].join(',')

    const params = new URLSearchParams({ place_id: placeId, fields, key })
    const res = await fetch(`${PLACES_BASE}/details/json?${params}`)
    const data = await res.json()

    if (data.status !== 'OK' || !data.result) return null
    return mapDetailsResult(data.result)
  }
}

function mapNearbyResult(place: Record<string, unknown>): DiscoveredVenue {
  const loc = (place.geometry as Record<string, unknown>)?.location as Record<string, number> | undefined
  return {
    externalId: place.place_id as string,
    name: place.name as string,
    addressLine1: (place.vicinity as string) || '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    lat: loc?.lat || 0,
    lng: loc?.lng || 0,
    googleRating: place.rating as number | undefined,
    googleReviewCount: place.user_ratings_total as number | undefined,
    priceLevel: place.price_level as number | undefined,
    types: place.types as string[] | undefined,
  }
}

function mapDetailsResult(place: Record<string, unknown>): DiscoveredVenue {
  const loc = ((place.geometry as Record<string, unknown>)?.location as Record<string, number>) || {}
  const components = (place.address_components as Array<Record<string, unknown>>) || []

  // Extract address parts from components
  let streetNumber = ''
  let route = ''
  let city = ''
  let county = ''
  let postcode = ''
  for (const comp of components) {
    const types = comp.types as string[]
    const long = comp.long_name as string
    if (types.includes('street_number')) streetNumber = long
    if (types.includes('route')) route = long
    if (types.includes('postal_town')) city = long
    if (types.includes('locality') && !city) city = long
    if (types.includes('administrative_area_level_2')) county = long
    if (types.includes('postal_code')) postcode = long
  }

  // Parse opening hours
  const hoursData = place.opening_hours as Record<string, unknown> | undefined
  const periods = (hoursData?.periods as Array<Record<string, unknown>>) || []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const openingHours = periods
    .filter((p) => p.open && p.close)
    .map((p) => {
      const openPart = p.open as Record<string, unknown>
      const closePart = p.close as Record<string, unknown>
      const day = dayNames[Number(openPart.day)] || 'Unknown'
      const openTime = String(openPart.time || '0000').replace(/(\d{2})(\d{2})/, '$1:$2')
      const closeTime = String(closePart.time || '0000').replace(/(\d{2})(\d{2})/, '$1:$2')
      return { day, open: openTime, close: closeTime }
    })

  // Photos (we store reference, not download)
  const photosData = (place.photos as Array<Record<string, unknown>>) || []
  const photos = photosData.slice(0, 5).map((p) => ({
    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${getApiKey()}`,
    attribution: ((p.html_attributions as string[]) || [])[0] || 'Google',
  }))

  const summary = place.editorial_summary as Record<string, unknown> | undefined

  return {
    externalId: place.place_id as string,
    name: place.name as string,
    addressLine1: [streetNumber, route].filter(Boolean).join(' ') || (place.formatted_address as string) || '',
    city,
    county,
    postcode,
    country: 'United Kingdom',
    lat: loc.lat || 0,
    lng: loc.lng || 0,
    phone: place.formatted_phone_number as string | undefined,
    website: place.website as string | undefined,
    googleRating: place.rating as number | undefined,
    googleReviewCount: place.user_ratings_total as number | undefined,
    priceLevel: place.price_level as number | undefined,
    description: summary?.overview as string | undefined,
    types: place.types as string[] | undefined,
    openingHours,
    photos,
  }
}
