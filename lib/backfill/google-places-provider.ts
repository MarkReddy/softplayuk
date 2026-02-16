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

  const keywords = ['soft play', 'indoor play centre', 'childrens play centre']

  for (const keyword of keywords) {
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

      console.log(`[v0] Google Nearby Search: keyword="${keyword}" page=${page} location=${lat},${lng}`)

      const res = await fetch(`${BASE}/nearbysearch/json?${params}`)
      if (!res.ok) {
        console.error(`[v0] Google API HTTP error: ${res.status} ${res.statusText}`)
        break
      }

      const data = await res.json()

      console.log(`[v0] Google response status: ${data.status}, results: ${(data.results || []).length}`)

      if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('[v0] Google API: OVER_QUERY_LIMIT - stopping searches')
        break
      }
      if (data.status === 'REQUEST_DENIED') {
        console.error('[v0] Google API: REQUEST_DENIED -', data.error_message || 'check API key')
        throw new Error(`Google API REQUEST_DENIED: ${data.error_message || 'Invalid API key or API not enabled'}`)
      }
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error(`[v0] Google API unexpected status: ${data.status}`, data.error_message)
        break
      }

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
      // Google requires a short delay before using next_page_token
      if (nextPageToken) await sleep(2200)
    } while (nextPageToken && page < 3)
  }

  console.log(`[v0] searchCell total: ${venues.length} unique venues from (${lat}, ${lng})`)
  return venues
}

/**
 * Enrich a venue with full Place Details (phone, website, hours, postcode, county).
 */
export async function enrichVenue(googlePlaceId: string): Promise<Partial<DiscoveredVenue> | null> {
  const key = getKey()
  const params = new URLSearchParams({
    place_id: googlePlaceId,
    fields: 'formatted_phone_number,website,opening_hours,address_components,formatted_address,photos',
    key,
  })

  const res = await fetch(`${BASE}/details/json?${params}`)
  if (!res.ok) {
    console.error(`[v0] Place Details HTTP error: ${res.status}`)
    return null
  }

  const data = await res.json()
  if (data.status !== 'OK') {
    console.error(`[v0] Place Details status: ${data.status}`, data.error_message)
    return null
  }

  const r = data.result || {}
  const components = r.address_components || []

  let postcode = '', county = '', city = ''
  for (const c of components) {
    if (c.types?.includes('postal_code')) postcode = c.long_name
    if (c.types?.includes('administrative_area_level_2')) county = c.long_name
    if (c.types?.includes('postal_town')) city = c.long_name
    if (!city && c.types?.includes('locality')) city = c.long_name
  }

  const hours = (r.opening_hours?.periods || [])
    .filter((p: { open?: unknown; close?: unknown }) => p.open && p.close)
    .map((p: { open: { day: number; time: string }; close: { time: string } }) => ({
      day: p.open.day,
      open: `${String(p.open.time).slice(0, 2)}:${String(p.open.time).slice(2)}`,
      close: `${String(p.close.time).slice(0, 2)}:${String(p.close.time).slice(2)}`,
    }))

  const photoRefs: string[] = (r.photos || [])
    .slice(0, 10)
    .map((p: { photo_reference: string }) => p.photo_reference)
    .filter(Boolean)

  return {
    phone: r.formatted_phone_number || null,
    website: r.website || null,
    postcode: postcode || undefined,
    county: county || undefined,
    city: city || undefined,
    openingHours: hours.length > 0 ? hours : undefined,
    photoReferences: photoRefs.length > 0 ? photoRefs : undefined,
  }
}
