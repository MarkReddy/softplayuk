import { neon } from '@neondatabase/serverless'
import type { BackfillConfig, BackfillProgress, DiscoveredVenue } from './types'
import { generateGrid } from './types'
import { searchCell, enrichVenue } from './google-places-provider'

function getSQL() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return neon(url)
}

function slugify(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

// ─── Create a run ────────────────────────────────────────────

export async function createRun(config: BackfillConfig): Promise<number> {
  const sql = getSQL()
  const cells = generateGrid(config)

  const rows = await sql`
    INSERT INTO backfill_runs (
      provider, mode, region_label, status, total_cells, config
    ) VALUES (
      ${config.provider},
      ${config.mode},
      ${config.region || config.city || 'Full UK'},
      'pending',
      ${cells.length},
      ${JSON.stringify(config)}
    )
    RETURNING id
  `
  return Number(rows[0].id)
}

// ─── Execute a run ───────────────────────────────────────────

export async function executeRun(runId: number): Promise<BackfillProgress> {
  const sql = getSQL()

  const runRows = await sql`SELECT * FROM backfill_runs WHERE id = ${runId}`
  if (runRows.length === 0) throw new Error(`Run ${runId} not found`)
  const run = runRows[0]

  const config: BackfillConfig = typeof run.config === 'string' ? JSON.parse(run.config) : run.config
  const cells = generateGrid(config)

  await sql`
    UPDATE backfill_runs SET
      status = 'running', started_at = NOW(), total_cells = ${cells.length}
    WHERE id = ${runId}
  `

  let discovered = 0, inserted = 0, updated = 0, skipped = 0, failed = 0, enriched = 0
  let processedCells = Number(run.processed_cells) || 0

  // Global dedup across cells
  const seenPlaceIds = new Set<string>()
  const existingBv = await sql`SELECT google_place_id FROM backfill_venues WHERE run_id = ${runId}`
  for (const v of existingBv) seenPlaceIds.add(v.google_place_id as string)

  try {
    for (let i = processedCells; i < cells.length; i++) {
      const cell = cells[i]
      let cellVenues: DiscoveredVenue[] = []

      try {
        cellVenues = await searchCell(cell.lat, cell.lng, cell.radiusMetres)
      } catch (err) {
        failed++
        await sql`
          UPDATE backfill_runs SET
            failed_venues = failed_venues + 1,
            error_log = COALESCE(error_log, '') || ${`\nCell ${i} error: ${err instanceof Error ? err.message : String(err)}`}
          WHERE id = ${runId}
        `
        processedCells = i + 1
        continue
      }

      for (const venue of cellVenues) {
        discovered++
        if (seenPlaceIds.has(venue.googlePlaceId)) { skipped++; continue }
        seenPlaceIds.add(venue.googlePlaceId)

        // Enrich if requested
        let enrichedData: Partial<DiscoveredVenue> = {}
        if (config.enrichDetails) {
          try {
            const details = await enrichVenue(venue.googlePlaceId)
            if (details) { enrichedData = details; enriched++ }
          } catch { /* continue with basic data */ }
        }

        const final = { ...venue, ...enrichedData }
        const venueSlug = slugify(final.name, final.city || config.city || config.region || 'uk')

        try {
          // Check existing
          const existingRows = await sql`SELECT id FROM venues WHERE google_place_id = ${final.googlePlaceId}`

          let venueId: number
          if (existingRows.length > 0) {
            venueId = Number(existingRows[0].id)
            await sql`
              UPDATE venues SET
                name = ${final.name}, lat = ${final.lat}, lng = ${final.lng},
                address_line1 = ${final.address},
                city = COALESCE(NULLIF(${final.city || ''}, ''), city),
                county = COALESCE(NULLIF(${final.county || ''}, ''), county),
                postcode = COALESCE(NULLIF(${final.postcode || ''}, ''), postcode),
                google_rating = ${final.googleRating},
                google_review_count = ${final.googleReviewCount},
                phone = COALESCE(${final.phone || null}, phone),
                website = COALESCE(${final.website || null}, website),
                last_google_sync = NOW(),
                confidence_score = CASE
                  WHEN ${final.postcode || ''} != '' AND ${final.phone || ''} != '' THEN 0.9
                  WHEN ${final.postcode || ''} != '' THEN 0.7 ELSE 0.5 END,
                enrichment_status = ${config.enrichDetails ? 'enriched' : 'basic'}
              WHERE id = ${venueId}
            `
            updated++
          } else {
            const insertRows = await sql`
              INSERT INTO venues (
                slug, name, lat, lng, address_line1, city, county, postcode, country,
                google_place_id, google_rating, google_review_count,
                phone, website, status, last_google_sync, confidence_score, enrichment_status
              ) VALUES (
                ${venueSlug}, ${final.name}, ${final.lat}, ${final.lng},
                ${final.address}, ${final.city || ''}, ${final.county || ''},
                ${final.postcode || ''}, 'United Kingdom',
                ${final.googlePlaceId}, ${final.googleRating}, ${final.googleReviewCount},
                ${final.phone || null}, ${final.website || null},
                'active', NOW(),
                ${final.postcode ? 0.7 : 0.5},
                ${config.enrichDetails ? 'enriched' : 'basic'}
              )
              ON CONFLICT (slug) DO UPDATE SET
                google_place_id = EXCLUDED.google_place_id,
                google_rating = EXCLUDED.google_rating,
                google_review_count = EXCLUDED.google_review_count,
                last_google_sync = NOW()
              RETURNING id
            `
            venueId = Number(insertRows[0].id)
            inserted++
          }

          // Log in backfill_venues
          await sql`
            INSERT INTO backfill_venues (
              run_id, venue_id, google_place_id, status, confidence_score, enrichment_status, raw_data
            ) VALUES (
              ${runId}, ${venueId}, ${final.googlePlaceId},
              ${existingRows.length > 0 ? 'updated' : 'inserted'},
              ${final.postcode ? 0.7 : 0.5},
              ${config.enrichDetails ? 'enriched' : 'basic'},
              ${JSON.stringify(final)}
            )
            ON CONFLICT (run_id, google_place_id) DO UPDATE SET
              status = 'updated', updated_at = NOW()
          `

          // Opening hours
          if (final.openingHours && final.openingHours.length > 0) {
            await sql`DELETE FROM venue_opening_hours WHERE venue_id = ${venueId}`
            for (const h of final.openingHours) {
              await sql`
                INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time)
                VALUES (${venueId}, ${h.day}, ${h.open}, ${h.close})
              `
            }
          }
        } catch (err) {
          failed++
          await sql`
            INSERT INTO backfill_venues (
              run_id, google_place_id, status, error_message, raw_data
            ) VALUES (
              ${runId}, ${final.googlePlaceId}, 'failed',
              ${err instanceof Error ? err.message : String(err)},
              ${JSON.stringify(final)}
            )
            ON CONFLICT (run_id, google_place_id) DO UPDATE SET
              status = 'failed', error_message = EXCLUDED.error_message, updated_at = NOW()
          `
        }
      }

      processedCells = i + 1
      await sql`
        UPDATE backfill_runs SET
          processed_cells = ${processedCells},
          venues_discovered = ${discovered}, venues_inserted = ${inserted},
          venues_updated = ${updated}, venues_skipped = ${skipped},
          failed_venues = ${failed}, enriched_venues = ${enriched}, updated_at = NOW()
        WHERE id = ${runId}
      `
    }

    await sql`
      UPDATE backfill_runs SET
        status = 'completed', processed_cells = ${processedCells},
        venues_discovered = ${discovered}, venues_inserted = ${inserted},
        venues_updated = ${updated}, venues_skipped = ${skipped},
        failed_venues = ${failed}, enriched_venues = ${enriched},
        completed_at = NOW(), duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        updated_at = NOW()
      WHERE id = ${runId}
    `
  } catch (err) {
    await sql`
      UPDATE backfill_runs SET
        status = 'failed',
        error_log = ${err instanceof Error ? err.message : String(err)},
        processed_cells = ${processedCells},
        venues_discovered = ${discovered}, venues_inserted = ${inserted},
        venues_updated = ${updated}, venues_skipped = ${skipped},
        failed_venues = ${failed}, enriched_venues = ${enriched},
        completed_at = NOW(), duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        updated_at = NOW()
      WHERE id = ${runId}
    `
  }

  return getRunProgress(runId)
}

// ─── Get run progress ────────────────────────────────────────

export async function getRunProgress(runId: number): Promise<BackfillProgress> {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM backfill_runs WHERE id = ${runId}`
  if (rows.length === 0) throw new Error(`Run ${runId} not found`)
  const r = rows[0]
  return {
    runId: Number(r.id),
    status: r.status as BackfillProgress['status'],
    mode: (r.mode || 'full_uk') as BackfillProgress['mode'],
    region: r.region_label as string | null,
    totalCells: Number(r.total_cells) || 0,
    processedCells: Number(r.processed_cells) || 0,
    discovered: Number(r.venues_discovered) || 0,
    inserted: Number(r.venues_inserted) || 0,
    updated: Number(r.venues_updated) || 0,
    skipped: Number(r.venues_skipped) || 0,
    failed: Number(r.failed_venues) || 0,
    enriched: Number(r.enriched_venues) || 0,
    startedAt: r.started_at ? String(r.started_at) : r.created_at ? String(r.created_at) : '',
    updatedAt: r.updated_at ? String(r.updated_at) : '',
    error: r.error_log as string | null,
    durationMs: r.duration_ms ? Number(r.duration_ms) : null,
  }
}

// ─── List runs ───────────────────────────────────────────────

export async function listRuns(limit = 20): Promise<BackfillProgress[]> {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM backfill_runs ORDER BY created_at DESC LIMIT ${limit}`
  return rows.map((r) => ({
    runId: Number(r.id),
    status: r.status as BackfillProgress['status'],
    mode: (r.mode || 'full_uk') as BackfillProgress['mode'],
    region: r.region_label as string | null,
    totalCells: Number(r.total_cells) || 0,
    processedCells: Number(r.processed_cells) || 0,
    discovered: Number(r.venues_discovered) || 0,
    inserted: Number(r.venues_inserted) || 0,
    updated: Number(r.venues_updated) || 0,
    skipped: Number(r.venues_skipped) || 0,
    failed: Number(r.failed_venues) || 0,
    enriched: Number(r.enriched_venues) || 0,
    startedAt: r.started_at ? String(r.started_at) : r.created_at ? String(r.created_at) : '',
    updatedAt: r.updated_at ? String(r.updated_at) : '',
    error: r.error_log as string | null,
    durationMs: r.duration_ms ? Number(r.duration_ms) : null,
  }))
}

// ─── Get per-venue logs for a run ────────────────────────────

export async function getRunVenues(runId: number): Promise<{
  total: number
  venues: { googlePlaceId: string; venueId: number | null; venueName: string | null; venueCity: string | null; status: string; confidence: number; enrichment: string; error: string | null; createdAt: string }[]
}> {
  const sql = getSQL()
  const countRows = await sql`SELECT COUNT(*) as cnt FROM backfill_venues WHERE run_id = ${runId}`
  const rows = await sql`
    SELECT bv.*, v.name as venue_name, v.city as venue_city
    FROM backfill_venues bv
    LEFT JOIN venues v ON bv.venue_id = v.id
    WHERE bv.run_id = ${runId}
    ORDER BY bv.created_at DESC
    LIMIT 200
  `
  return {
    total: Number(countRows[0]?.cnt) || 0,
    venues: rows.map((r) => ({
      googlePlaceId: r.google_place_id as string,
      venueId: r.venue_id ? Number(r.venue_id) : null,
      venueName: (r.venue_name as string) || null,
      venueCity: (r.venue_city as string) || null,
      status: r.status as string,
      confidence: Number(r.confidence_score) || 0,
      enrichment: (r.enrichment_status as string) || 'basic',
      error: (r.error_message as string) || null,
      createdAt: r.created_at ? String(r.created_at) : '',
    })),
  }
}
