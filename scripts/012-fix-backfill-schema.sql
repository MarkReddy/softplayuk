-- Fix backfill schema to match engine.ts expectations
-- Drop and recreate both backfill tables with correct column names and CHECK constraints

DROP TABLE IF EXISTS backfill_venues CASCADE;
DROP TABLE IF EXISTS backfill_runs CASCADE;

CREATE TABLE backfill_runs (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'google_places',
  mode TEXT NOT NULL DEFAULT 'full_uk' CHECK (mode IN ('full_uk','region','city','radius')),
  region_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
  total_cells INTEGER DEFAULT 0,
  processed_cells INTEGER DEFAULT 0,
  venues_discovered INTEGER DEFAULT 0,
  venues_inserted INTEGER DEFAULT 0,
  venues_updated INTEGER DEFAULT 0,
  venues_skipped INTEGER DEFAULT 0,
  failed_venues INTEGER DEFAULT 0,
  enriched_venues INTEGER DEFAULT 0,
  error_log TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE backfill_venues (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES backfill_runs(id) ON DELETE CASCADE,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  google_place_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','inserted','updated','enriched','failed','skipped')),
  confidence_score REAL DEFAULT 0,
  enrichment_status TEXT DEFAULT 'basic' CHECK (enrichment_status IN ('basic','enriched','failed')),
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(run_id, google_place_id)
);

-- Indexes
CREATE INDEX idx_bf_runs_status ON backfill_runs(status);
CREATE INDEX idx_bf_runs_created ON backfill_runs(created_at DESC);
CREATE INDEX idx_bf_venues_run ON backfill_venues(run_id);
CREATE INDEX idx_bf_venues_status ON backfill_venues(status);
CREATE INDEX idx_bf_venues_place ON backfill_venues(google_place_id);

-- Ensure venues table has required columns
ALTER TABLE venues ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_google_sync TIMESTAMPTZ;

-- Unique constraint for deduplication by google_place_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_dedupe_place ON venues(google_place_id) WHERE google_place_id IS NOT NULL;
