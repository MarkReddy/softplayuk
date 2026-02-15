/**
 * Google Places API Ingestion Script -- UK-Wide Coverage
 *
 * Strategy: Covers the entire UK mainland using a grid of overlapping
 * circles (16 km radius) across the bounding box of the UK.
 * Each grid cell queries Google Places Nearby Search with pagination
 * (next_page_token) to capture all results.
 *
 * Required env vars:
 *   DATABASE_URL          - Neon connection string
 *   GOOGLE_PLACES_API_KEY - Google Cloud API key with Places API (New) enabled
 *
 * Usage:
 *   node scripts/ingest-google-places.js
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1); }
if (!API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1); }

const sql = neon(DATABASE_URL);

// ─── UK Bounding Box & Grid ─────────────────────────────────
// Covers mainland GB + NI with generous padding
const UK_BOUNDS = {
  south: 49.9,   // south coast
  north: 58.7,   // north Scotland
  west: -8.2,    // west Ireland/Wales
  east: 1.8,     // east coast
};

// 16 km radius search circles, with ~25 km step (overlap ensures no gaps)
const SEARCH_RADIUS_M = 16000;
const STEP_KM = 25;

function generateGrid() {
  const points = [];
  const latStep = STEP_KM / 111; // 1 degree lat ~ 111 km
  for (let lat = UK_BOUNDS.south; lat <= UK_BOUNDS.north; lat += latStep) {
    const lngStep = STEP_KM / (111 * Math.cos(lat * Math.PI / 180));
    for (let lng = UK_BOUNDS.west; lng <= UK_BOUNDS.east; lng += lngStep) {
      points.push({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
    }
  }
  return points;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Google Places API (New) with Pagination ─────────────────

async function searchNearby(lat, lng, pageToken) {
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: ['amusement_center', 'indoor_playground'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS_M,
      },
    },
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.regularOpeningHours',
        'places.photos',
        'places.reviews',
        'places.types',
        'places.addressComponents',
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Google Places search failed at (${lat},${lng}):`, err.substring(0, 200));
    return { places: [], nextPageToken: null };
  }

  const data = await res.json();
  return {
    places: data.places || [],
    nextPageToken: data.nextPageToken || null,
  };
}

// Fetch ALL results for a grid point (follow pagination)
async function searchAllPages(lat, lng) {
  const allPlaces = [];
  let pageToken = null;
  let page = 0;

  do {
    if (page > 0) {
      // Google requires a short delay before using next_page_token
      await new Promise(r => setTimeout(r, 2000));
    }
    const result = await searchNearby(lat, lng, pageToken);
    allPlaces.push(...result.places);
    pageToken = result.nextPageToken;
    page++;
  } while (pageToken && page < 5); // max 5 pages = 100 results per cell

  return allPlaces;
}

// ─── Helpers ─────────────────────────────────────────────────

function extractCity(addressComponents) {
  if (!addressComponents) return null;
  const cityComp = addressComponents.find(
    c => c.types?.includes('postal_town') || c.types?.includes('locality')
  );
  return cityComp?.longText || null;
}

function extractCounty(addressComponents) {
  if (!addressComponents) return null;
  const comp = addressComponents.find(c => c.types?.includes('administrative_area_level_2'));
  return comp?.longText || null;
}

function extractPostcode(addressComponents) {
  if (!addressComponents) return null;
  const pc = addressComponents.find(c => c.types?.includes('postal_code'));
  return pc?.longText || null;
}

function isSoftPlayVenue(place) {
  const name = (place.displayName?.text || '').toLowerCase();
  const keywords = ['play', 'soft', 'bounce', 'adventure', 'jungle', 'kids',
    'children', 'toddler', 'fun', 'trampoline', 'climb', 'party', 'foam'];
  const nameMatch = keywords.some(k => name.includes(k));
  const typeMatch = (place.types || []).some(t =>
    ['indoor_playground', 'amusement_center'].includes(t)
  );
  return nameMatch || typeMatch;
}

// ─── Upsert Logic ────────────────────────────────────────────

async function upsertVenue(place) {
  const name = place.displayName?.text || 'Unknown Venue';
  const placeId = place.id;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const address = place.formattedAddress || '';
  const city = extractCity(place.addressComponents) || 'Unknown';
  const county = extractCounty(place.addressComponents) || '';
  const postcode = extractPostcode(place.addressComponents) || '';
  const phone = place.nationalPhoneNumber || '';
  const website = place.websiteUri || '';
  const googleRating = place.rating || null;
  const googleReviewCount = place.userRatingCount || 0;
  const slug = slugify(`${name}-${city}`);

  if (!isSoftPlayVenue(place)) {
    return { skipped: true, name };
  }

  const result = await sql`
    INSERT INTO venues (
      slug, name, description, address_line1, city, county, postcode, country,
      lat, lng, phone, website, google_place_id, google_rating, google_review_count,
      price_range, status, last_google_sync, updated_at
    ) VALUES (
      ${slug}, ${name}, ${''}, ${address}, ${city}, ${county}, ${postcode}, 'GB',
      ${lat}, ${lng}, ${phone}, ${website}, ${placeId}, ${googleRating}, ${googleReviewCount},
      'mid', 'active', now(), now()
    )
    ON CONFLICT (google_place_id) DO UPDATE SET
      name = EXCLUDED.name,
      address_line1 = EXCLUDED.address_line1,
      city = EXCLUDED.city,
      county = EXCLUDED.county,
      postcode = EXCLUDED.postcode,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      google_rating = EXCLUDED.google_rating,
      google_review_count = EXCLUDED.google_review_count,
      last_google_sync = now(),
      updated_at = now()
    RETURNING id, (xmax = 0) AS is_new
  `;

  const venueId = result[0].id;
  const isNew = result[0].is_new;

  // Upsert source
  await sql`
    INSERT INTO venue_sources (venue_id, source_type, source_id, last_fetched_at, raw_data)
    VALUES (${venueId}, 'google_places', ${placeId}, now(), ${JSON.stringify(place)}::jsonb)
    ON CONFLICT DO NOTHING
  `;

  // Upsert opening hours
  if (place.regularOpeningHours?.periods) {
    for (const period of place.regularOpeningHours.periods) {
      const dayOfWeek = period.open?.day ?? 0;
      const openTime = period.open?.hour != null
        ? `${String(period.open.hour).padStart(2, '0')}:${String(period.open.minute || 0).padStart(2, '0')}`
        : null;
      const closeTime = period.close?.hour != null
        ? `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute || 0).padStart(2, '0')}`
        : null;
      await sql`
        INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
        VALUES (${venueId}, ${dayOfWeek}, ${openTime}, ${closeTime}, ${!openTime})
        ON CONFLICT (venue_id, day_of_week) DO UPDATE SET
          open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, is_closed = EXCLUDED.is_closed
      `;
    }
  }

  // Insert Google photos (first 5)
  if (place.photos?.length) {
    await sql`DELETE FROM venue_images WHERE venue_id = ${venueId} AND source = 'google'`;
    for (const photo of place.photos.slice(0, 5)) {
      const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${API_KEY}`;
      const attribution = photo.authorAttributions?.[0]?.displayName || 'Google';
      await sql`
        INSERT INTO venue_images (venue_id, url, source, attribution, is_primary)
        VALUES (${venueId}, ${photoUrl}, 'google', ${attribution}, false)
      `;
    }
    await sql`
      UPDATE venue_images SET is_primary = true
      WHERE id = (SELECT id FROM venue_images WHERE venue_id = ${venueId} ORDER BY id ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM venue_images WHERE venue_id = ${venueId} AND is_primary = true)
    `;
  }

  // Insert Google reviews (first 5)
  if (place.reviews?.length) {
    for (const review of place.reviews.slice(0, 5)) {
      const authorName = review.authorAttribution?.displayName || 'Google User';
      const rating = review.rating || 0;
      const body = review.text?.text || '';
      const googleReviewId = review.name || `${placeId}_${authorName}`;
      await sql`
        INSERT INTO reviews (venue_id, source, author_name, rating, body, google_review_id, created_at)
        VALUES (${venueId}, 'google', ${authorName}, ${rating}, ${body}, ${googleReviewId}, now())
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return { skipped: false, isNew, name, venueId };
}

// ─── Auto-Generate City Pages ────────────────────────────────

async function generateCityPages() {
  console.log('\nGenerating city pages from venue data...');
  const cities = await sql`
    SELECT city, county, AVG(lat) as lat, AVG(lng) as lng, COUNT(*) as cnt
    FROM venues WHERE status = 'active' AND city IS NOT NULL AND city != 'Unknown'
    GROUP BY city, county
    HAVING COUNT(*) >= 1
    ORDER BY COUNT(*) DESC
  `;

  let created = 0;
  for (const c of cities) {
    const slug = slugify(c.city);
    const desc = `Discover the best soft play centres in ${c.city}. Browse parent reviews, compare facilities, and find the perfect play centre for your children.`;
    await sql`
      INSERT INTO city_pages (slug, name, county, lat, lng, description, venue_count)
      VALUES (${slug}, ${c.city}, ${c.county || ''}, ${c.lat}, ${c.lng}, ${desc}, ${Number(c.cnt)})
      ON CONFLICT (slug) DO UPDATE SET
        venue_count = EXCLUDED.venue_count,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng
    `;
    created++;
  }
  console.log(`  Created/updated ${created} city pages`);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const grid = generateGrid();
  console.log('=== UK-Wide Google Places Ingestion ===');
  console.log(`Grid cells: ${grid.length}`);
  console.log(`Search radius: ${SEARCH_RADIUS_M / 1000} km per cell`);
  console.log(`Step: ${STEP_KM} km\n`);

  const seenPlaceIds = new Set();
  let totalNew = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let cellsProcessed = 0;

  for (const point of grid) {
    cellsProcessed++;
    if (cellsProcessed % 50 === 0) {
      console.log(`  Progress: ${cellsProcessed}/${grid.length} cells (${Math.round(cellsProcessed / grid.length * 100)}%)`);
    }

    const places = await searchAllPages(point.lat, point.lng);

    for (const place of places) {
      // Deduplicate across grid cells
      if (seenPlaceIds.has(place.id)) continue;
      seenPlaceIds.add(place.id);

      try {
        const result = await upsertVenue(place);
        if (result.skipped) {
          totalSkipped++;
        } else if (result.isNew) {
          totalNew++;
          console.log(`  NEW: ${result.name}`);
        } else {
          totalUpdated++;
        }
      } catch (err) {
        console.error(`  Error upserting ${place.displayName?.text}:`, err.message);
      }
    }

    // Rate limit: ~5 QPS to Google
    await new Promise(r => setTimeout(r, 200));
  }

  // Auto-generate city pages from venue data
  await generateCityPages();

  const counts = await sql`SELECT COUNT(*) as total FROM venues WHERE status = 'active'`;
  console.log('\n=== Ingestion Complete ===');
  console.log(`Grid cells processed: ${cellsProcessed}`);
  console.log(`Unique place IDs seen: ${seenPlaceIds.size}`);
  console.log(`New venues: ${totalNew}`);
  console.log(`Updated venues: ${totalUpdated}`);
  console.log(`Skipped (not soft play): ${totalSkipped}`);
  console.log(`Total active venues in database: ${counts[0].total}`);
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
