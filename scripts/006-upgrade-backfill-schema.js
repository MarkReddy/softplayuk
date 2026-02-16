import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  console.log('[v0] Upgrading backfill schema for full UK ingestion...');

  // Drop and recreate backfill tables with enhanced schema
  await sql`DROP TABLE IF EXISTS backfill_venues CASCADE`;
  await sql`DROP TABLE IF EXISTS backfill_runs CASCADE`;

  await sql`
    CREATE TABLE backfill_runs (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'google_places',
      mode TEXT NOT NULL DEFAULT 'regions' CHECK (mode IN ('regions','cities','postcodePrefixes','all')),
      region_label TEXT NOT NULL,
      regions TEXT[] NOT NULL DEFAULT '{}',
      cities TEXT[] NOT NULL DEFAULT '{}',
      postcode_prefixes TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','paused','completed','failed','cancelled')),
      dry_run BOOLEAN DEFAULT false,
      batch_size INTEGER DEFAULT 50,
      concurrency INTEGER DEFAULT 2,
      total_cells INTEGER DEFAULT 0,
      completed_cells INTEGER DEFAULT 0,
      venues_discovered INTEGER DEFAULT 0,
      venues_inserted INTEGER DEFAULT 0,
      venues_updated INTEGER DEFAULT 0,
      venues_enriched INTEGER DEFAULT 0,
      venues_failed INTEGER DEFAULT 0,
      venues_skipped INTEGER DEFAULT 0,
      errors JSONB DEFAULT '[]'::jsonb,
      config JSONB DEFAULT '{}'::jsonb,
      last_processed_cell INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created enhanced backfill_runs table');

  await sql`
    CREATE TABLE backfill_venues (
      id SERIAL PRIMARY KEY,
      run_id INTEGER REFERENCES backfill_runs(id) ON DELETE CASCADE,
      venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
      google_place_id TEXT,
      name TEXT NOT NULL DEFAULT '',
      city TEXT,
      county TEXT,
      postcode TEXT,
      action TEXT NOT NULL DEFAULT 'discovered' CHECK (action IN ('discovered','inserted','updated','enriched','failed','skipped')),
      enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending','partial','complete','failed')),
      confidence_score REAL DEFAULT 0,
      error TEXT,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created enhanced backfill_venues table');

  // Add confidence_score to main venues table if not exists
  await sql`ALTER TABLE venues ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 0`;
  await sql`ALTER TABLE venues ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'`;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_bf_runs_status ON backfill_runs(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bf_runs_created ON backfill_runs(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bf_venues_run ON backfill_venues(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bf_venues_action ON backfill_venues(action)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bf_venues_place ON backfill_venues(google_place_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_confidence ON venues(confidence_score)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_venues_enrichment ON venues(enrichment_status)`;

  // Unique constraint for deterministic dedupe on venues
  // normalized name + postcode + address_line1 OR google_place_id
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_dedupe_place ON venues(google_place_id) WHERE google_place_id IS NOT NULL`;

  console.log('[v0] Enhanced backfill schema migration complete!');
}

migrate().catch((err) => {
  console.error('[v0] Migration failed:', err.message);
  process.exit(1);
});
