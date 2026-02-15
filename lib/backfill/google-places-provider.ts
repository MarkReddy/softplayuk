import type { DiscoveredVenue } from './types'

const BASE = 'https://maps.googleapis.com/maps/api/place'

function getKey(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY
  if (!k) throw new Error('GOOGLE_PLACES_API_KEY not set')
  return k
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Search a single grid cell for soft play venues.
 * Uses 3 keyword variants, follows pagination, deduplicates by place_id.
 */
export async function searchCell(
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<DiscoveredVenue[]> {
  const key = getKey()
  const seen = new Set<string>()
  const venues: DiscoveredVenue[] = []

  for (const keyword of ['soft play', 'indoor play centre', 'childrens play centre']) {
    let nextPageToken: string | undefined
    let page = 0

    do {
      const params = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: String(Math.min(radiusMetres, 50000)),
        keyword,
        type: 'establishment',
        key,
      })
      if (nextPageToken) params.set('pagetoken', nextPageToken)

      const res = await fetch(`${BASE}/nearbysearch/json?${params}`)
      const data = await res.json()

      if (data.status === 'OVER_QUERY_LIMIT') break
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') break

      for (const place of data.results || []) {
        const pid = place.place_id as string
        if (seen.has(pid)) continue
        seen.add(pid)

        const loc = place.geometry?.location || {}
        const addressParts = (place.vicinity || place.formatted_address || '').split(',').map((s: string) => s.trim())

        venues.push({
          googlePlaceId: pid,
          name: place.name || '',
          lat: loc.lat || lat,
          lng: loc.lng || lng,
          address: place.vicinity || place.formatted_address || '',
          city: addressParts[addressParts.length - 1] || '',
          county: '',
          postcode: '',
          googleRating: place.rating ?? null,
          googleReviewCount: place.user_ratings_total ?? null,
          types: place.types || [],
          businessStatus: place.business_status || 'OPERATIONAL',
          photoReferences: (place.photos || []).slice(0, 5).map((p: { photo_reference: string }) => p.photo_reference),
        })
      }

      nextPageToken = data.next_page_token
      page++
      if (nextPageToken) await sleep(2200)
    } while (nextPageToken && page < 3)
  }

  return venues
}

/**
 * Enrich a venue with full Place Details (phone, website, hours, postcode, county).
 */
export async function enrichVenue(googlePlaceId: string): Promise<Partial<DiscoveredVenue> | null> {
  const key = getKey()
  const params = new URLSearchParams({
    place_id: googlePlaceId,
    fields: 'formatted_phone_number,website,opening_hours,address_components,formatted_address',
    key,
  })

  const res = await fetch(`${BASE}/details/json?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'OK') return null

  const r = data.result || {}
  const components = r.address_components || []

  let postcode = '', county = '', city = ''
  for (const c of components) {
    if (c.types?.includes('postal_code')) postcode = c.long_name
    if (c.types?.includes('administrative_area_level_2')) county = c.long_name
    if (c.types?.includes('postal_town')) city = c.long_name
    if (!city && c.types?.includes('locality')) city = c.long_name
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const hours = (r.opening_hours?.periods || [])
    .filter((p: { open?: unknown; close?: unknown }) => p.open && p.close)
    .map((p: { open: { day: number; time: string }; close: { time: string } }) => ({
      day: dayNames[p.open.day] || String(p.open.day),
      open: `${String(p.open.time).slice(0, 2)}:${String(p.open.time).slice(2)}`,
      close: `${String(p.close.time).slice(0, 2)}:${String(p.close.time).slice(2)}`,
    }))

  return {
    phone: r.formatted_phone_number || null,
    website: r.website || null,
    postcode: postcode || undefined,
    county: county || undefined,
    city: city || undefined,
    openingHours: hours.length > 0 ? hours : undefined,
  }
}
