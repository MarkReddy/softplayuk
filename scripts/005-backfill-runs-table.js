import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  console.log('[v0] Creating backfill_runs table...');

  await sql`
    CREATE TABLE IF NOT EXISTS backfill_runs (
      id SERIAL PRIMARY KEY,
      region TEXT NOT NULL,
      cities TEXT[] NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed','cancelled')),
      dry_run BOOLEAN DEFAULT false,
      discovered INTEGER DEFAULT 0,
      inserted INTEGER DEFAULT 0,
      updated INTEGER DEFAULT 0,
      enriched INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      last_error TEXT,
      log JSONB DEFAULT '[]'::jsonb,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created backfill_runs table');

  await sql`
    CREATE TABLE IF NOT EXISTS backfill_venues (
      id SERIAL PRIMARY KEY,
      run_id INTEGER REFERENCES backfill_runs(id) ON DELETE CASCADE,
      venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
      google_place_id TEXT,
      name TEXT NOT NULL,
      city TEXT,
      status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','inserted','enriched','failed','skipped')),
      error TEXT,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('[v0] Created backfill_venues table');

  await sql`CREATE INDEX IF NOT EXISTS idx_backfill_runs_status ON backfill_runs(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_backfill_venues_run_id ON backfill_venues(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_backfill_venues_status ON backfill_venues(status)`;

  console.log('[v0] Backfill migration complete!');
}

migrate().catch((err) => {
  console.error('[v0] Migration failed:', err.message);
  process.exit(1);
});
