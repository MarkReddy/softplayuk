import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!GOOGLE_PLACES_API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1) }

const sql = neon(DATABASE_URL)
const BASE = 'https://maps.googleapis.com/maps/api/place'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ─── Major UK cities to search for soft play ────────────────
const CITIES = [
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581 },
  { name: 'Leicester', lat: 52.6369, lng: -1.1398 },
  { name: 'Coventry', lat: 52.4068, lng: -1.5197 },
  { name: 'Belfast', lat: 54.5973, lng: -5.9301 },
  { name: 'Brighton', lat: 50.8225, lng: -0.1372 },
  { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
  { name: 'Plymouth', lat: 50.3755, lng: -4.1427 },
  { name: 'Reading', lat: 51.4543, lng: -0.9781 },
  { name: 'Derby', lat: 52.9225, lng: -1.4746 },
  { name: 'Wolverhampton', lat: 52.5870, lng: -2.1288 },
  { name: 'Stoke-on-Trent', lat: 53.0027, lng: -2.1794 },
  { name: 'Swansea', lat: 51.6214, lng: -3.9436 },
  { name: 'Milton Keynes', lat: 52.0406, lng: -0.7594 },
  { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
  { name: 'Norwich', lat: 52.6309, lng: 1.2974 },
  { name: 'Oxford', lat: 51.7520, lng: -1.2577 },
  { name: 'Cambridge', lat: 52.2053, lng: 0.1218 },
  { name: 'York', lat: 53.9591, lng: -1.0815 },
  { name: 'Exeter', lat: 50.7184, lng: -3.5339 },
  { name: 'Bath', lat: 51.3811, lng: -2.3590 },
  { name: 'Cheltenham', lat: 51.8994, lng: -2.0783 },
  { name: 'Swindon', lat: 51.5558, lng: -1.7797 },
  { name: 'Bournemouth', lat: 50.7192, lng: -1.8808 },
  { name: 'Blackpool', lat: 53.8175, lng: -3.0357 },
  { name: 'Sunderland', lat: 54.9069, lng: -1.3838 },
  { name: 'Doncaster', lat: 53.5228, lng: -1.1285 },
  { name: 'Bolton', lat: 53.5785, lng: -2.4299 },
  { name: 'Wigan', lat: 53.5448, lng: -2.6318 },
  { name: 'Solihull', lat: 52.4120, lng: -1.7780 },
  { name: 'Dudley', lat: 52.5086, lng: -2.0872 },
  { name: 'Huddersfield', lat: 53.6450, lng: -1.7798 },
  { name: 'Burnley', lat: 53.7893, lng: -2.2479 },
  { name: 'Warrington', lat: 53.3900, lng: -2.5970 },
  { name: 'Chester', lat: 53.1930, lng: -2.8931 },
  { name: 'Ipswich', lat: 52.0567, lng: 1.1482 },
  { name: 'Colchester', lat: 51.8959, lng: 0.8919 },
  { name: 'Peterborough', lat: 52.5695, lng: -0.2405 },
  { name: 'Gloucester', lat: 51.8642, lng: -2.2382 },
  { name: 'Worcester', lat: 52.1936, lng: -2.2216 },
]

function slugify(name, city) {
  return `${name}-${city}`.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

// ─── Search for soft play venues near a location ────────────
async function searchNear(lat, lng, radiusM = 30000) {
  const venues = []
  const seen = new Set()
  
  for (const keyword of ['soft play', 'indoor play centre', 'childrens play centre']) {
    let nextPageToken
    let page = 0
    do {
      const params = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: String(radiusM),
        keyword,
        type: 'establishment',
        key: GOOGLE_PLACES_API_KEY
      })
      if (nextPageToken) params.set('pagetoken', nextPageToken)
      
      const res = await fetch(`${BASE}/nearbysearch/json?${params}`)
      const data = await res.json()
      
      if (data.status === 'OVER_QUERY_LIMIT') {
        console.log('  RATE LIMITED -- waiting 60s')
        await sleep(60000)
        continue
      }
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') break
      
      for (const place of data.results || []) {
        if (seen.has(place.place_id)) continue
        seen.add(place.place_id)
        const loc = place.geometry?.location || {}
        venues.push({
          googlePlaceId: place.place_id,
          name: place.name || '',
          lat: loc.lat || lat,
          lng: loc.lng || lng,
          address: place.vicinity || place.formatted_address || '',
          googleRating: place.rating ?? null,
          googleReviewCount: place.user_ratings_total ?? null,
        })
      }
      
      nextPageToken = data.next_page_token
      page++
      if (nextPageToken) await sleep(2200)
    } while (nextPageToken && page < 3)
  }
  return venues
}

// ─── Enrich a single venue ──────────────────────────────────
async function enrichVenue(googlePlaceId) {
  const params = new URLSearchParams({
    place_id: googlePlaceId,
    fields: 'formatted_phone_number,website,opening_hours,address_components,formatted_address,photos',
    key: GOOGLE_PLACES_API_KEY
  })
  const res = await fetch(`${BASE}/details/json?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status === 'OVER_QUERY_LIMIT') {
    console.log('  RATE LIMITED on enrich -- waiting 60s')
    await sleep(60000)
    return null
  }
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
  
  const hours = (r.opening_hours?.periods || [])
    .filter(p => p.open && p.close)
    .map(p => ({
      day: p.open.day,
      open: `${String(p.open.time).slice(0, 2)}:${String(p.open.time).slice(2)}`,
      close: `${String(p.close.time).slice(0, 2)}:${String(p.close.time).slice(2)}`,
    }))
  
  const photoRefs = (r.photos || []).slice(0, 10).map(p => p.photo_reference).filter(Boolean)
  
  return {
    phone: r.formatted_phone_number || null,
    website: r.website || null,
    postcode, county, city,
    openingHours: hours,
    photoReferences: photoRefs
  }
}

// ─── Save venue to DB ───────────────────────────────────────
async function saveVenue(venue) {
  const slug = slugify(venue.name, venue.city || 'uk')
  
  // Check if already exists
  const existing = await sql`SELECT id FROM venues WHERE google_place_id = ${venue.googlePlaceId}`
  let venueId
  
  if (existing.length > 0) {
    venueId = Number(existing[0].id)
    await sql`
      UPDATE venues SET
        name = ${venue.name},
        lat = ${venue.lat}, lng = ${venue.lng},
        address_line1 = ${venue.address},
        city = COALESCE(NULLIF(${venue.city || ''}, ''), city),
        county = COALESCE(NULLIF(${venue.county || ''}, ''), county),
        postcode = COALESCE(NULLIF(${venue.postcode || ''}, ''), postcode),
        google_rating = COALESCE(${venue.googleRating}, google_rating),
        google_review_count = COALESCE(${venue.googleReviewCount}, google_review_count),
        phone = COALESCE(${venue.phone || null}, phone),
        website = COALESCE(${venue.website || null}, website),
        last_google_sync = NOW(),
        enrichment_status = 'enriched'
      WHERE id = ${venueId}
    `
  } else {
    const inserted = await sql`
      INSERT INTO venues (
        slug, name, lat, lng, address_line1, city, county, postcode, country,
        google_place_id, google_rating, google_review_count,
        phone, website, status, last_google_sync, enrichment_status
      ) VALUES (
        ${slug}, ${venue.name}, ${venue.lat}, ${venue.lng},
        ${venue.address}, ${venue.city || ''}, ${venue.county || ''}, ${venue.postcode || ''}, 'United Kingdom',
        ${venue.googlePlaceId}, ${venue.googleRating}, ${venue.googleReviewCount},
        ${venue.phone || null}, ${venue.website || null},
        'active', NOW(), 'enriched'
      ) ON CONFLICT (slug) DO UPDATE SET
        google_place_id = EXCLUDED.google_place_id,
        google_rating = EXCLUDED.google_rating,
        last_google_sync = NOW()
      RETURNING id
    `
    venueId = Number(inserted[0].id)
  }
  
  // Save opening hours
  if (venue.openingHours && venue.openingHours.length > 0) {
    await sql`DELETE FROM venue_opening_hours WHERE venue_id = ${venueId}`
    for (const h of venue.openingHours) {
      await sql`
        INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time)
        VALUES (${venueId}, ${h.day}, ${h.open}, ${h.close})
      `
    }
  }
  
  // Save photos
  if (venue.photoReferences && venue.photoReferences.length > 0) {
    await sql`DELETE FROM venue_images WHERE venue_id = ${venueId} AND source = 'google'`
    for (let i = 0; i < venue.photoReferences.length; i++) {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${venue.photoReferences[i]}&key=${GOOGLE_PLACES_API_KEY}`
      await sql`
        INSERT INTO venue_images (venue_id, url, alt, source, is_primary, attribution)
        VALUES (${venueId}, ${photoUrl}, ${`${venue.name} - photo ${i + 1}`}, 'google', ${i === 0}, 'Google Maps')
      `
    }
    // Set primary image on venue
    const primaryUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${venue.photoReferences[0]}&key=${GOOGLE_PLACES_API_KEY}`
    await sql`UPDATE venues SET image_url = ${primaryUrl} WHERE id = ${venueId}`
  }
  
  return { venueId, isNew: existing.length === 0 }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('=== UK Soft Play Discovery + Enrichment ===')
  console.log(`${CITIES.length} cities to search, starting at ${new Date().toISOString()}\n`)
  
  const globalSeen = new Set()
  
  // Load existing google_place_ids
  const existingRows = await sql`SELECT google_place_id FROM venues WHERE google_place_id IS NOT NULL`
  for (const r of existingRows) globalSeen.add(r.google_place_id)
  console.log(`${globalSeen.size} existing venues in DB\n`)
  
  let totalDiscovered = 0, totalNew = 0, totalUpdated = 0, totalEnriched = 0
  
  for (let ci = 0; ci < CITIES.length; ci++) {
    const city = CITIES[ci]
    console.log(`[${ci + 1}/${CITIES.length}] Searching ${city.name}...`)
    
    let venues
    try {
      venues = await searchNear(city.lat, city.lng, 30000)
    } catch (err) {
      console.log(`  ERROR searching: ${err.message}`)
      continue
    }
    
    console.log(`  Found ${venues.length} venues`)
    totalDiscovered += venues.length
    
    for (const venue of venues) {
      const isExisting = globalSeen.has(venue.googlePlaceId)
      globalSeen.add(venue.googlePlaceId)
      
      try {
        // Enrich every venue
        const details = await enrichVenue(venue.googlePlaceId)
        if (details) {
          Object.assign(venue, details)
          totalEnriched++
        }
        await sleep(150) // Rate limit buffer
        
        const result = await saveVenue(venue)
        if (result.isNew) totalNew++
        else totalUpdated++
      } catch (err) {
        console.log(`  ERROR saving ${venue.name}: ${err.message}`)
      }
    }
    
    console.log(`  Running: ${totalNew} new, ${totalUpdated} updated, ${totalEnriched} enriched\n`)
  }
  
  console.log('=== COMPLETE ===')
  console.log(`Discovered: ${totalDiscovered}`)
  console.log(`New:        ${totalNew}`)
  console.log(`Updated:    ${totalUpdated}`)
  console.log(`Enriched:   ${totalEnriched}`)
  
  const finalCount = await sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`
  console.log(`Total active venues: ${finalCount[0].cnt}`)
  console.log(`Finished at ${new Date().toISOString()}`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
