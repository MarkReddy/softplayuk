-- SoftPlayFinder Database Schema
-- Neon PostgreSQL

-- ─── Venues ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',

  -- Location
  address       TEXT NOT NULL,
  postcode      TEXT NOT NULL,
  city          TEXT NOT NULL,
  area          TEXT NOT NULL DEFAULT '',
  local_authority TEXT DEFAULT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,

  -- Contact
  phone         TEXT NOT NULL DEFAULT '',
  website       TEXT NOT NULL DEFAULT '',

  -- Media
  image_url     TEXT NOT NULL DEFAULT '',

  -- Categorisation
  primary_category TEXT NOT NULL DEFAULT 'soft_play',
  age_range_min INTEGER NOT NULL DEFAULT 0,
  age_range_max INTEGER NOT NULL DEFAULT 8,
  price_band    INTEGER NOT NULL DEFAULT 2 CHECK (price_band IN (1, 2, 3)),

  -- Flags
  sen_friendly  BOOLEAN NOT NULL DEFAULT FALSE,
  party_rooms   BOOLEAN NOT NULL DEFAULT FALSE,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Ratings (split by source)
  google_rating          DOUBLE PRECISION DEFAULT NULL,
  google_review_count    INTEGER DEFAULT NULL,
  first_party_rating     DOUBLE PRECISION NOT NULL DEFAULT 0,
  first_party_review_count INTEGER NOT NULL DEFAULT 0,
  cleanliness_score      DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- Data provenance
  source_priority TEXT NOT NULL DEFAULT 'manual',
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ofsted
  ofsted_urn    TEXT DEFAULT NULL,
  ofsted_link   TEXT DEFAULT NULL,
  has_ofsted_record BOOLEAN DEFAULT FALSE
);

-- ─── Venue Images ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_images (
  id            SERIAL PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'first_party',
  attribution   TEXT DEFAULT NULL,
  uploaded_by   TEXT DEFAULT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ─── Amenities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_amenities (
  id            SERIAL PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  amenity_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL DEFAULT 'circle',
  source        TEXT DEFAULT NULL
);

-- ─── Opening Hours ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_opening_hours (
  id            SERIAL PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week   TEXT NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  hours         TEXT NOT NULL DEFAULT 'Closed',
  UNIQUE(venue_id, day_of_week)
);

-- ─── Source Attributions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_sources (
  id            SERIAL PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  source        TEXT NOT NULL,
  source_id     TEXT DEFAULT NULL,
  source_url    TEXT DEFAULT NULL,
  last_fetched_at TIMESTAMPTZ DEFAULT NULL,
  attribution   TEXT DEFAULT NULL
);

-- ─── Reviews ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  source        TEXT NOT NULL DEFAULT 'first_party',
  attribution   TEXT DEFAULT NULL,
  user_name     TEXT NOT NULL,
  rating        DOUBLE PRECISION NOT NULL,
  cleanliness_rating DOUBLE PRECISION DEFAULT NULL,
  value_rating  DOUBLE PRECISION DEFAULT NULL,
  age_suitability_rating DOUBLE PRECISION DEFAULT NULL,
  comment       TEXT NOT NULL DEFAULT '',
  helpful       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── City Pages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_pages (
  slug          TEXT PRIMARY KEY,
  city          TEXT NOT NULL,
  area          TEXT DEFAULT NULL,
  description   TEXT NOT NULL DEFAULT '',
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_lat_lng ON venues(lat, lng);
CREATE INDEX IF NOT EXISTS idx_venues_featured ON venues(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_images_venue_id ON venue_images(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_amenities_venue_id ON venue_amenities(venue_id);
