import { neon } from '@neondatabase/serverless'
import type { Venue, VenueImage, Review, CityPage, OpeningHours, Amenity, SourceAttribution } from './types'

const sql = neon(process.env.DATABASE_URL!)

// ─── Row → Venue Hydrator ──────────────────────────────────
function hydrateVenue(
  row: Record<string, unknown>,
  images: VenueImage[],
  hours: OpeningHours,
  sources: SourceAttribution[],
): Venue {
  const ageRange = typeof row.age_range === 'string' ? row.age_range : '0-12'
  const [ageMin, ageMax] = ageRange.split('-').map(Number)

  // Build amenities from boolean columns
  const amenities: Amenity[] = []
  if (row.has_cafe) amenities.push({ id: 'cafe', name: 'Cafe', icon: 'coffee' })
  if (row.has_parking) amenities.push({ id: 'parking', name: 'Parking', icon: 'car' })
  if (row.has_party_rooms) amenities.push({ id: 'party-rooms', name: 'Party rooms', icon: 'party-popper' })
  if (row.is_sen_friendly) amenities.push({ id: 'sen', name: 'SEN friendly', icon: 'heart' })
  if (row.has_baby_area) amenities.push({ id: 'baby-area', name: 'Baby area', icon: 'baby' })
  if (row.has_outdoor) amenities.push({ id: 'outdoor', name: 'Outdoor area', icon: 'tree' })

  // Map price_range to priceBand
  const priceMap: Record<string, 1 | 2 | 3> = { free: 1, budget: 1, mid: 2, premium: 3 }
  const priceBand = priceMap[row.price_range as string] || 2

  return {
    id: String(row.id),
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string || '',
    shortDescription: ((row.description as string) || '').substring(0, 160) + '...',
    address: [row.address_line1, row.address_line2, row.city, row.county].filter(Boolean).join(', '),
    postcode: row.postcode as string,
    city: row.city as string,
    area: row.county as string || row.city as string,
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: row.phone as string || '',
    website: row.website as string || '',
    imageUrl: images[0]?.url || '/images/venue-1.jpg',
    images,
    primaryCategory: 'soft_play',
    ageRange: { min: ageMin || 0, max: ageMax || 12 },
    priceBand,
    amenities,
    openingHours: hours,
    senFriendly: Boolean(row.is_sen_friendly),
    partyRooms: Boolean(row.has_party_rooms),
    verified: row.status === 'active',
    featured: Boolean(row.google_rating && Number(row.google_rating) >= 4.5),
    googleRating: row.google_rating ? Number(row.google_rating) : undefined,
    googleReviewCount: Number(row.google_review_count) || 0,
    firstPartyRating: Number(row.first_party_rating) || 0,
    firstPartyReviewCount: Number(row.first_party_review_count) || 0,
    cleanlinessScore: Number(row.cleanliness_score) || 0,
    sourcePriority: row.google_place_id ? 'google_places' : 'manual',
    sources,
    lastRefreshedAt: row.last_google_sync ? String(row.last_google_sync) : String(row.updated_at),
    createdAt: String(row.created_at),
  }
}

// ─── Fetch Related Data for a Venue ────────────────────────
async function fetchVenueRelations(venueId: number) {
  const [imageRows, hoursRows, sourceRows] = await Promise.all([
    sql`SELECT * FROM venue_images WHERE venue_id = ${venueId} ORDER BY is_primary DESC, id ASC`,
    sql`SELECT * FROM venue_opening_hours WHERE venue_id = ${venueId} ORDER BY day_of_week ASC`,
    sql`SELECT * FROM venue_sources WHERE venue_id = ${venueId}`,
  ])

  const images: VenueImage[] = imageRows.map((r) => ({
    url: r.url as string,
    source: (r.source as string) === 'google' ? 'google_places' as const : 'manual' as const,
    attribution: r.attribution as string | undefined,
  }))

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const hours: OpeningHours = {
    monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed',
    thursday: 'Closed', friday: 'Closed', saturday: 'Closed', sunday: 'Closed',
  }
  for (const hr of hoursRows) {
    const dayIdx = Number(hr.day_of_week)
    const dayName = dayNames[dayIdx]
    if (dayName) {
      hours[dayName] = hr.is_closed ? 'Closed' : `${hr.open_time} - ${hr.close_time}`
    }
  }

  const sources: SourceAttribution[] = sourceRows.map((r) => ({
    source: r.source_type as SourceAttribution['source'],
    sourceId: r.source_id as string | undefined,
    lastFetchedAt: r.last_fetched_at ? String(r.last_fetched_at) : undefined,
    attribution: r.source_type === 'google_places' ? 'Google' : 'Softplay UK',
  }))

  return { images, hours, sources }
}

// ─── Public Query Functions ────────────────────────────────

export async function getAllVenues(): Promise<Venue[]> {
  const rows = await sql`SELECT * FROM venues WHERE status = 'active' ORDER BY name ASC`
  const venues: Venue[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }
  return venues
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const rows = await sql`SELECT * FROM venues WHERE slug = ${slug} AND status = 'active' LIMIT 1`
  if (rows.length === 0) return null
  const row = rows[0]
  const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
  return hydrateVenue(row, images, hours, sources)
}

export async function getFeaturedVenues(): Promise<Venue[]> {
  const rows = await sql`
    SELECT * FROM venues
    WHERE status = 'active'
      AND google_rating >= 4.5
    ORDER BY google_rating DESC
    LIMIT 6
  `
  const venues: Venue[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }
  return venues
}

export async function getVenuesByCity(city: string): Promise<Venue[]> {
  const rows = await sql`
    SELECT * FROM venues WHERE LOWER(city) = ${city.toLowerCase()} AND status = 'active' ORDER BY name ASC
  `
  const venues: Venue[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }
  return venues
}

export async function searchVenues(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<(Venue & { distance: number })[]> {
  // Use Haversine formula in SQL via subquery for distance filtering
  const rows = await sql`
    SELECT * FROM (
      SELECT *,
        (3959 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(lat)) *
            cos(radians(lng) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(lat))
          ))
        )) AS distance_miles
      FROM venues
      WHERE status = 'active'
    ) AS v
    WHERE distance_miles <= ${radiusMiles}
    ORDER BY distance_miles ASC
  `

  const venues: (Venue & { distance: number })[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    const venue = hydrateVenue(row, images, hours, sources)
    venues.push({ ...venue, distance: Number(row.distance_miles) })
  }
  return venues
}

export async function getVenueReviews(venueId: string): Promise<Review[]> {
  const rows = await sql`
    SELECT * FROM reviews WHERE venue_id = ${Number(venueId)} ORDER BY created_at DESC
  `
  return rows.map((r) => ({
    id: String(r.id),
    venueId: String(r.venue_id),
    source: r.source as 'first_party' | 'google',
    attribution: r.source === 'google' ? 'Google' : undefined,
    userName: r.author_name as string,
    rating: Number(r.rating),
    cleanlinessRating: r.cleanliness_rating ? Number(r.cleanliness_rating) : undefined,
    valueRating: r.value_rating ? Number(r.value_rating) : undefined,
    ageSuitabilityRating: r.fun_rating ? Number(r.fun_rating) : undefined,
    comment: r.body as string || '',
    helpful: 0,
    createdAt: String(r.created_at),
  }))
}

export async function getCityPage(slug: string): Promise<CityPage | null> {
  const rows = await sql`SELECT * FROM city_pages WHERE slug = ${slug} LIMIT 1`
  if (rows.length === 0) return null
  const r = rows[0]

  // Get real venue count
  const countRows = await sql`SELECT COUNT(*) as cnt FROM venues WHERE LOWER(city) = ${(r.name as string).toLowerCase()} AND status = 'active'`
  const venueCount = Number(countRows[0]?.cnt) || 0

  return {
    slug: r.slug as string,
    city: r.name as string,
    area: r.county as string | undefined,
    description: r.description as string || '',
    venueCount,
    lat: Number(r.lat),
    lng: Number(r.lng),
  }
}

export async function getAllCityPages(): Promise<CityPage[]> {
  const rows = await sql`SELECT * FROM city_pages ORDER BY name ASC`
  const pages: CityPage[] = []
  for (const r of rows) {
    const countRows = await sql`SELECT COUNT(*) as cnt FROM venues WHERE LOWER(city) = ${(r.name as string).toLowerCase()} AND status = 'active'`
    const venueCount = Number(countRows[0]?.cnt) || 0
    pages.push({
      slug: r.slug as string,
      city: r.name as string,
      area: r.county as string | undefined,
      description: r.description as string || '',
      venueCount,
      lat: Number(r.lat),
      lng: Number(r.lng),
    })
  }
  return pages
}

export async function getAllVenueSlugs(): Promise<string[]> {
  const rows = await sql`SELECT slug FROM venues WHERE status = 'active'`
  return rows.map((r) => r.slug as string)
}

// ─── Paginated / Count Queries ─────────────────────────────

export async function getVenueCount(): Promise<number> {
  const rows = await sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`
  return Number(rows[0]?.cnt) || 0
}

export async function getVenuesPaginated(
  limit: number,
  offset: number,
): Promise<{ venues: Venue[]; total: number }> {
  const countRows = await sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`
  const total = Number(countRows[0]?.cnt) || 0

  const rows = await sql`
    SELECT * FROM venues WHERE status = 'active'
    ORDER BY name ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const venues: Venue[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }

  return { venues, total }
}

export async function searchVenuesByText(query: string): Promise<Venue[]> {
  const pattern = `%${query}%`
  const rows = await sql`
    SELECT * FROM venues
    WHERE status = 'active'
      AND (
        LOWER(name) LIKE LOWER(${pattern})
        OR LOWER(city) LIKE LOWER(${pattern})
        OR LOWER(postcode) LIKE LOWER(${pattern})
        OR LOWER(address_line1) LIKE LOWER(${pattern})
        OR LOWER(county) LIKE LOWER(${pattern})
      )
    ORDER BY name ASC
    LIMIT 50
  `

  const venues: Venue[] = []
  for (const row of rows) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }
  return venues
}

export async function checkDbHealth(): Promise<{ ok: boolean; venueCount: number; latestSync: string | null }> {
  try {
    const countRows = await sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`
    const syncRows = await sql`SELECT MAX(last_google_sync) as latest FROM venues`
    return {
      ok: true,
      venueCount: Number(countRows[0]?.cnt) || 0,
      latestSync: syncRows[0]?.latest ? String(syncRows[0].latest) : null,
    }
  } catch {
    return { ok: false, venueCount: 0, latestSync: null }
  }
}
