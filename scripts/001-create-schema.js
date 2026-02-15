import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

console.log('[v0] DATABASE_URL prefix:', databaseUrl.substring(0, 30) + '...');

const sql = neon(databaseUrl);

async function migrate() {
  console.log('[v0] Starting schema migration...');

  // Create venues table
  await sql`
    CREATE TABLE IF NOT EXISTS venues (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT NOT NULL,
      county TEXT,
      postcode TEXT NOT NULL,
      country TEXT DEFAULT 'GB',
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      google_place_id TEXT UNIQUE,
      google_rating NUMERIC(2,1),
      google_review_count INTEGER DEFAULT 0,
      first_party_rating NUMERIC(2,1),
      first_party_review_count INTEGER DEFAULT 0,
      cleanliness_score NUMERIC(2,1),
      price_range TEXT CHECK (price_range IN ('free','budget','mid','premium')),
      age_range TEXT,
      has_cafe BOOLEAN DEFAULT false,
      has_parking BOOLEAN DEFAULT false,
      has_party_rooms BOOLEAN DEFAULT false,
      is_sen_friendly BOOLEAN DEFAULT false,
      has_baby_area BOOLEAN DEFAULT false,
      has_outdoor BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','closed','flagged')),
      last_google_sync TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created venues table');

  // Create venue_images table
  await sql`
    CREATE TABLE IF NOT EXISTS venue_images (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      alt TEXT,
      source TEXT DEFAULT 'manual' CHECK (source IN ('google','manual','owner')),
      is_primary BOOLEAN DEFAULT false,
      attribution TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created venue_images table');

  // Create venue_opening_hours table
  await sql`
    CREATE TABLE IF NOT EXISTS venue_opening_hours (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      open_time TEXT,
      close_time TEXT,
      is_closed BOOLEAN DEFAULT false,
      UNIQUE(venue_id, day_of_week)
    )
  `;
  console.log('[v0] Created venue_opening_hours table');

  // Create venue_sources table
  await sql`
    CREATE TABLE IF NOT EXISTS venue_sources (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK (source_type IN ('google_places','osm','manual','owner_claimed')),
      source_id TEXT,
      last_fetched_at TIMESTAMPTZ,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created venue_sources table');

  // Create reviews table
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
      source TEXT DEFAULT 'first_party' CHECK (source IN ('google','first_party')),
      author_name TEXT NOT NULL,
      rating NUMERIC(2,1) NOT NULL,
      body TEXT,
      visit_date TEXT,
      cleanliness_rating NUMERIC(2,1),
      value_rating NUMERIC(2,1),
      fun_rating NUMERIC(2,1),
      food_rating NUMERIC(2,1),
      google_review_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created reviews table');

  // Create city_pages table
  await sql`
    CREATE TABLE IF NOT EXISTS city_pages (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      county TEXT,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      description TEXT,
      meta_title TEXT,
      meta_description TEXT,
      venue_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created city_pages table');

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_lat_lng ON venues(lat, lng)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues(google_place_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venue_images_venue_id ON venue_images(venue_id)`;
  console.log('[v0] Created indexes');

  console.log('[v0] Migration complete!');
}

migrate().catch((err) => {
  console.error('[v0] Migration failed:', err.message);
  process.exit(1);
});
