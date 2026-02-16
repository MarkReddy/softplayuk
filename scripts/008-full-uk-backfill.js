import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!GOOGLE_PLACES_API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1) }

const sql = neon(DATABASE_URL)
const BASE = 'https://maps.googleapis.com/maps/api/place'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ─── Region grid definitions ────────────────────────────────
const REGION_BOUNDS = {
  'west-midlands': { minLat: 52.2, maxLat: 52.9, minLng: -2.3, maxLng: -1.3 },
  'east-midlands': { minLat: 52.4, maxLat: 53.2, minLng: -1.8, maxLng: -0.7 },
  'greater-london': { minLat: 51.28, maxLat: 51.69, minLng: -0.51, maxLng: 0.33 },
  'greater-manchester': { minLat: 53.3, maxLat: 53.7, minLng: -2.7, maxLng: -1.9 },
  'south-east': { minLat: 50.7, maxLat: 51.9, minLng: -1.9, maxLng: 1.5 },
  'south-west': { minLat: 50.0, maxLat: 52.0, minLng: -5.7, maxLng: -1.7 },
  'north-west': { minLat: 53.0, maxLat: 55.8, minLng: -3.6, maxLng: -2.0 },
  'north-east': { minLat: 54.4, maxLat: 55.8, minLng: -2.5, maxLng: -1.0 },
  'yorkshire': { minLat: 53.3, maxLat: 54.5, minLng: -2.5, maxLng: -0.5 },
  'east-of-england': { minLat: 51.5, maxLat: 52.9, minLng: -0.5, maxLng: 1.8 },
  'wales': { minLat: 51.3, maxLat: 53.5, minLng: -5.3, maxLng: -2.6 },
  'scotland': { minLat: 54.6, maxLat: 58.7, minLng: -7.6, maxLng: -0.7 },
  'northern-ireland': { minLat: 54.0, maxLat: 55.4, minLng: -8.2, maxLng: -5.4 },
}

function generateGrid(bounds) {
  const stepKm = 20
  const radiusMetres = 16000
  const cells = []
  const latStep = stepKm / 111
  const midLat = (bounds.minLat + bounds.maxLat) / 2
  const lngStep = stepKm / (111 * Math.cos((midLat * Math.PI) / 180))
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      cells.push({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, radiusMetres })
    }
  }
  return cells
}

function slugify(name, city) {
  const base = `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120)
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

// ─── Search a grid cell ─────────────────────────────────────
async function searchCell(lat, lng, radiusMetres) {
  const seen = new Set()
  const venues = []
  for (const keyword of ['soft play', 'indoor play centre', 'childrens play centre']) {
    let nextPageToken
    let page = 0
    do {
      const params = new URLSearchParams({
        location: `${lat},${lng}`, radius: String(Math.min(radiusMetres, 50000)),
        keyword, type: 'establishment', key: GOOGLE_PLACES_API_KEY
      })
      if (nextPageToken) params.set('pagetoken', nextPageToken)
      const res = await fetch(`${BASE}/nearbysearch/json?${params}`)
      const data = await res.json()
      if (data.status === 'OVER_QUERY_LIMIT') { console.log('  RATE LIMITED -- waiting 60s'); await sleep(60000); continue }
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') break
      for (const place of data.results || []) {
        if (seen.has(place.place_id)) continue
        seen.add(place.place_id)
        const loc = place.geometry?.location || {}
        const addrParts = (place.vicinity || place.formatted_address || '').split(',').map(s => s.trim())
        venues.push({
          googlePlaceId: place.place_id,
          name: place.name || '',
          lat: loc.lat || lat, lng: loc.lng || lng,
          address: place.vicinity || place.formatted_address || '',
          city: addrParts[addrParts.length - 1] || '',
          googleRating: place.rating ?? null,
          googleReviewCount: place.user_ratings_total ?? null,
          types: place.types || [],
          businessStatus: place.business_status || 'OPERATIONAL',
          photoReferences: (place.photos || []).slice(0, 5).map(p => p.photo_reference).filter(Boolean),
        })
      }
      nextPageToken = data.next_page_token
      page++
      if (nextPageToken) await sleep(2200)
    } while (nextPageToken && page < 3)
  }
  return venues
}

// ─── Enrich a venue ─────────────────────────────────────────
async function enrichVenue(googlePlaceId) {
  const params = new URLSearchParams({
    place_id: googlePlaceId,
    fields: 'formatted_phone_number,website,opening_hours,address_components,formatted_address,photos',
    key: GOOGLE_PLACES_API_KEY
  })
  const res = await fetch(`${BASE}/details/json?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status === 'OVER_QUERY_LIMIT') { console.log('  ENRICH RATE LIMITED -- waiting 60s'); await sleep(60000); return null }
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
  return { phone: r.formatted_phone_number || null, website: r.website || null, postcode, county, city, openingHours: hours, photoReferences: photoRefs }
}

// ─── Save a venue ───────────────────────────────────────────
async function saveVenue(venue, regionLabel) {
  const slug = slugify(venue.name, venue.city || regionLabel || 'uk')
  const existingRows = await sql`SELECT id FROM venues WHERE google_place_id = ${venue.googlePlaceId}`
  let venueId
  if (existingRows.length > 0) {
    venueId = Number(existingRows[0].id)
    await sql`
      UPDATE venues SET
        name = ${venue.name}, lat = ${venue.lat}, lng = ${venue.lng},
        address_line1 = ${venue.address},
        city = COALESCE(NULLIF(${venue.city || ''}, ''), city),
        county = COALESCE(NULLIF(${venue.county || ''}, ''), county),
        postcode = COALESCE(NULLIF(${venue.postcode || ''}, ''), postcode),
        google_rating = ${venue.googleRating}, google_review_count = ${venue.googleReviewCount},
        phone = COALESCE(${venue.phone || null}, phone),
        website = COALESCE(${venue.website || null}, website),
        last_google_sync = NOW(),
        confidence_score = CASE WHEN ${venue.postcode || ''} != '' AND ${venue.phone || ''} != '' THEN 0.9
          WHEN ${venue.postcode || ''} != '' THEN 0.7 ELSE 0.5 END,
        enrichment_status = 'enriched'
      WHERE id = ${venueId}`
  } else {
    const insertRows = await sql`
      INSERT INTO venues (
        slug, name, lat, lng, address_line1, city, county, postcode, country,
        google_place_id, google_rating, google_review_count,
        phone, website, status, last_google_sync, confidence_score, enrichment_status
      ) VALUES (
        ${slug}, ${venue.name}, ${venue.lat}, ${venue.lng},
        ${venue.address}, ${venue.city || ''}, ${venue.county || ''}, ${venue.postcode || ''}, 'United Kingdom',
        ${venue.googlePlaceId}, ${venue.googleRating}, ${venue.googleReviewCount},
        ${venue.phone || null}, ${venue.website || null},
        'active', NOW(), ${venue.postcode ? 0.7 : 0.5}, 'enriched'
      ) ON CONFLICT (slug) DO UPDATE SET
        google_place_id = EXCLUDED.google_place_id,
        google_rating = EXCLUDED.google_rating,
        google_review_count = EXCLUDED.google_review_count,
        last_google_sync = NOW()
      RETURNING id`
    venueId = Number(insertRows[0].id)
  }

  // Opening hours
  if (venue.openingHours && venue.openingHours.length > 0) {
    await sql`DELETE FROM venue_opening_hours WHERE venue_id = ${venueId}`
    for (const h of venue.openingHours) {
      await sql`INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time)
        VALUES (${venueId}, ${h.day}, ${h.open}, ${h.close})`
    }
  }

  // Photos
  if (venue.photoReferences && venue.photoReferences.length > 0) {
    await sql`DELETE FROM venue_images WHERE venue_id = ${venueId} AND source = 'google'`
    for (let pi = 0; pi < venue.photoReferences.length; pi++) {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${venue.photoReferences[pi]}&key=${GOOGLE_PLACES_API_KEY}`
      await sql`INSERT INTO venue_images (venue_id, url, alt, source, is_primary, attribution)
        VALUES (${venueId}, ${photoUrl}, ${`${venue.name} - photo ${pi + 1}`}, 'google', ${pi === 0}, 'Google Maps')`
    }
    const primaryUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${venue.photoReferences[0]}&key=${GOOGLE_PLACES_API_KEY}`
    await sql`UPDATE venues SET image_url = ${primaryUrl} WHERE id = ${venueId}`
  }

  return { venueId, isNew: existingRows.length === 0 }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('=== Full UK Soft Play Backfill ===')
  console.log(`Starting at ${new Date().toISOString()}`)

  // First, purge the old seed data (placeholder google_place_ids)
  const purged = await sql`DELETE FROM venues WHERE google_place_id LIKE 'ChIJ_%' AND google_place_id NOT LIKE 'ChIJplaceholder%' RETURNING id`
  // Keep real Google data, only purge our fake seed IDs
  const seedPurge = await sql`DELETE FROM venues WHERE google_place_id LIKE 'ChIJ_b%' OR google_place_id LIKE 'ChIJ_k%' OR google_place_id LIKE 'ChIJ_c%' OR google_place_id LIKE 'ChIJ_s%' OR google_place_id LIKE 'ChIJ_m%' OR google_place_id LIKE 'ChIJ_e%' OR google_place_id LIKE 'ChIJ_n%' OR google_place_id LIKE 'ChIJ_l%' RETURNING id`
  console.log(`Purged ${seedPurge.length} old seed venues`)

  const globalSeen = new Set()
  // Load existing place IDs to skip
  const existing = await sql`SELECT google_place_id FROM venues WHERE google_place_id IS NOT NULL`
  for (const row of existing) globalSeen.add(row.google_place_id)
  console.log(`${globalSeen.size} existing venues in DB (will update, not skip)`)

  let totalDiscovered = 0, totalInserted = 0, totalUpdated = 0, totalEnriched = 0, totalFailed = 0

  const regions = Object.entries(REGION_BOUNDS)
  
  for (const [regionSlug, bounds] of regions) {
    const regionLabel = regionSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const cells = generateGrid(bounds)
    console.log(`\n--- ${regionLabel}: ${cells.length} cells ---`)

    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci]
      process.stdout.write(`  Cell ${ci + 1}/${cells.length} (${cell.lat}, ${cell.lng})... `)

      let cellVenues
      try {
        cellVenues = await searchCell(cell.lat, cell.lng, cell.radiusMetres)
      } catch (err) {
        console.log(`SEARCH ERROR: ${err.message}`)
        totalFailed++
        continue
      }

      // Deduplicate within this run
      const newVenues = cellVenues.filter(v => !globalSeen.has(v.googlePlaceId))
      const updateVenues = cellVenues.filter(v => globalSeen.has(v.googlePlaceId))
      
      for (const v of cellVenues) globalSeen.add(v.googlePlaceId)
      totalDiscovered += cellVenues.length

      console.log(`found ${cellVenues.length} (${newVenues.length} new, ${updateVenues.length} update)`)

      // Process all venues (new + updates)
      const allToProcess = [...newVenues, ...updateVenues]
      for (const venue of allToProcess) {
        try {
          // Enrich with Place Details
          const details = await enrichVenue(venue.googlePlaceId)
          if (details) {
            Object.assign(venue, details)
            totalEnriched++
          }
          // Small delay between enrichment calls
          await sleep(200)

          const result = await saveVenue(venue, regionLabel)
          if (result.isNew) totalInserted++
          else totalUpdated++
        } catch (err) {
          console.log(`    SAVE ERROR for ${venue.name}: ${err.message}`)
          totalFailed++
        }
      }
    }

    console.log(`  ${regionLabel} complete. Running totals: ${totalInserted} inserted, ${totalUpdated} updated, ${totalEnriched} enriched`)
  }

  console.log(`\n=== BACKFILL COMPLETE ===`)
  console.log(`Discovered: ${totalDiscovered}`)
  console.log(`Inserted:   ${totalInserted}`)
  console.log(`Updated:    ${totalUpdated}`)
  console.log(`Enriched:   ${totalEnriched}`)
  console.log(`Failed:     ${totalFailed}`)
  console.log(`Total unique venues in DB: ${globalSeen.size}`)

  const finalCount = await sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`
  console.log(`Active venues in DB: ${finalCount[0].cnt}`)
  console.log(`Finished at ${new Date().toISOString()}`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
