/**
 * Google Places API Ingestion Script
 * 
 * Fetches soft play venues from Google Places API (New) and upserts them
 * into the Neon database. Designed to be run periodically (e.g. weekly cron).
 *
 * Required env vars:
 *   DATABASE_URL          - Neon connection string
 *   GOOGLE_PLACES_API_KEY - Google Cloud API key with Places API (New) enabled
 *
 * Usage:
 *   node scripts/ingest-google-places.js
 *
 * What it does:
 *   1. For each city in the UK_CITIES list, searches Google Places API
 *      for "soft play" near the city centroid
 *   2. For each result, fetches full place details (hours, photos, reviews)
 *   3. Upserts the venue into the venues table (matched on google_place_id)
 *   4. Upserts images, opening hours, sources, and Google reviews
 *   5. Logs a summary of new vs updated venues
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY');
  console.error('Set it in your Vercel project environment variables.');
  console.error('Get one from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Cities to search -- add more as needed
const UK_CITIES = [
  { name: 'Manchester', lat: 53.4808, lng: -2.2426, county: 'Greater Manchester' },
  { name: 'London', lat: 51.5074, lng: -0.1278, county: 'Greater London' },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904, county: 'West Midlands' },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491, county: 'West Yorkshire' },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879, county: 'Avon' },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883, county: 'Midlothian' },
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518, county: 'Lanarkshire' },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916, county: 'Merseyside' },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701, county: 'South Yorkshire' },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178, county: 'Tyne and Wear' },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581, county: 'Nottinghamshire' },
  { name: 'Cardiff', lat: 51.4816, lng: -3.1791, county: 'South Glamorgan' },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Google Places API (New) ─────────────────────────────────

async function searchNearby(lat, lng) {
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: ['amusement_center', 'indoor_playground'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 16000, // 10 miles in meters
      },
    },
  };

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
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Google Places search failed:`, err);
    return [];
  }

  const data = await res.json();
  return data.places || [];
}

function extractCity(addressComponents) {
  if (!addressComponents) return null;
  const cityComp = addressComponents.find(
    (c) =>
      c.types?.includes('postal_town') ||
      c.types?.includes('locality')
  );
  return cityComp?.longText || null;
}

function extractPostcode(addressComponents) {
  if (!addressComponents) return null;
  const pc = addressComponents.find((c) => c.types?.includes('postal_code'));
  return pc?.longText || null;
}

function mapPriceRange(types) {
  // Simple heuristic -- override manually if needed
  if (types?.includes('amusement_park')) return 'premium';
  return 'mid';
}

// ─── Upsert Logic ────────────────────────────────────────────

async function upsertVenue(place, cityInfo) {
  const name = place.displayName?.text || 'Unknown Venue';
  const slug = slugify(`${name}-${cityInfo.name}`);
  const placeId = place.id;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const address = place.formattedAddress || '';
  const city = extractCity(place.addressComponents) || cityInfo.name;
  const postcode = extractPostcode(place.addressComponents) || '';
  const phone = place.nationalPhoneNumber || '';
  const website = place.websiteUri || '';
  const googleRating = place.rating || null;
  const googleReviewCount = place.userRatingCount || 0;
  const priceRange = mapPriceRange(place.types);

  // Check for "soft play" keywords in name to filter false positives
  const nameLower = name.toLowerCase();
  const isSoftPlay =
    nameLower.includes('play') ||
    nameLower.includes('soft') ||
    nameLower.includes('bounce') ||
    nameLower.includes('adventure') ||
    nameLower.includes('jungle') ||
    nameLower.includes('kids') ||
    nameLower.includes('children') ||
    nameLower.includes('toddler') ||
    nameLower.includes('fun') ||
    (place.types || []).includes('indoor_playground');

  if (!isSoftPlay) {
    console.log(`  Skipping "${name}" (doesn't appear to be soft play)`);
    return null;
  }

  // Upsert venue
  const result = await sql`
    INSERT INTO venues (
      slug, name, description, address_line1, city, county, postcode, country,
      lat, lng, phone, website, google_place_id, google_rating, google_review_count,
      price_range, status, last_google_sync, updated_at
    ) VALUES (
      ${slug}, ${name}, ${''}, ${address}, ${city}, ${cityInfo.county}, ${postcode}, 'GB',
      ${lat}, ${lng}, ${phone}, ${website}, ${placeId}, ${googleRating}, ${googleReviewCount},
      ${priceRange}, 'active', now(), now()
    )
    ON CONFLICT (google_place_id) DO UPDATE SET
      name = EXCLUDED.name,
      address_line1 = EXCLUDED.address_line1,
      city = EXCLUDED.city,
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
  console.log(`  ${isNew ? 'NEW' : 'UPDATED'}: ${name} (id=${venueId})`);

  // Upsert source record
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
          open_time = EXCLUDED.open_time,
          close_time = EXCLUDED.close_time,
          is_closed = EXCLUDED.is_closed
      `;
    }
  }

  // Insert Google photos (first 5)
  if (place.photos?.length) {
    // Delete old Google photos for this venue
    await sql`DELETE FROM venue_images WHERE venue_id = ${venueId} AND source = 'google'`;

    for (const photo of place.photos.slice(0, 5)) {
      const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${API_KEY}`;
      const attribution = photo.authorAttributions?.[0]?.displayName || 'Google';
      await sql`
        INSERT INTO venue_images (venue_id, url, source, attribution, is_primary)
        VALUES (${venueId}, ${photoUrl}, 'google', ${attribution}, false)
      `;
    }

    // Mark first image as primary if no primary exists
    await sql`
      UPDATE venue_images SET is_primary = true
      WHERE id = (
        SELECT id FROM venue_images WHERE venue_id = ${venueId} ORDER BY id ASC LIMIT 1
      ) AND NOT EXISTS (
        SELECT 1 FROM venue_images WHERE venue_id = ${venueId} AND is_primary = true
      )
    `;
  }

  // Insert Google reviews
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

  return { venueId, isNew, name };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('=== Google Places Ingestion Starting ===');
  console.log(`Searching ${UK_CITIES.length} cities for soft play venues...\n`);

  let totalNew = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const city of UK_CITIES) {
    console.log(`\nSearching: ${city.name}...`);
    const places = await searchNearby(city.lat, city.lng);
    console.log(`  Found ${places.length} results`);

    for (const place of places) {
      const result = await upsertVenue(place, city);
      if (result === null) {
        totalSkipped++;
      } else if (result.isNew) {
        totalNew++;
      } else {
        totalUpdated++;
      }
    }

    // Also upsert city page
    await sql`
      INSERT INTO city_pages (slug, name, county, lat, lng, description, venue_count)
      VALUES (
        ${slugify(city.name)}, ${city.name}, ${city.county},
        ${city.lat}, ${city.lng},
        ${'Discover the best soft play centres in ' + city.name + '. Browse parent reviews, compare facilities, and find the perfect play centre for your children.'},
        0
      )
      ON CONFLICT (slug) DO NOTHING
    `;

    // Rate limit -- Google allows 10 QPS, be conservative
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update venue counts on city pages
  await sql`
    UPDATE city_pages SET venue_count = (
      SELECT COUNT(*) FROM venues
      WHERE LOWER(venues.city) = LOWER(city_pages.name)
        AND venues.status = 'active'
    )
  `;

  console.log('\n=== Ingestion Complete ===');
  console.log(`New venues: ${totalNew}`);
  console.log(`Updated venues: ${totalUpdated}`);
  console.log(`Skipped (not soft play): ${totalSkipped}`);

  // Show final counts
  const counts = await sql`SELECT COUNT(*) as total FROM venues WHERE status = 'active'`;
  console.log(`Total active venues in database: ${counts[0].total}`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
