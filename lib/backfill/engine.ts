import { neon } from '@neondatabase/serverless'
import type { BackfillConfig, BackfillProgress, DiscoveredVenue } from './types'
import { generateGrid, UK_BOUNDS } from './types'
import { searchCell, enrichVenue } from './google-places-provider'

function getSQL() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return neon(url)
}

function isWithinUK(lat: number, lng: number): boolean {
  return lat >= UK_BOUNDS.minLat && lat <= UK_BOUNDS.maxLat &&
         lng >= UK_BOUNDS.minLng && lng <= UK_BOUNDS.maxLng
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

  console.log('[v0] createRun: mode=', config.mode, 'region=', config.region || config.city, 'cells=', cells.length)

  const rows = await sql`
    INSERT INTO backfill_runs (
      provider, mode, region_label, status, total_cells,
      processed_cells, venues_discovered, venues_inserted, venues_updated,
      venues_skipped, failed_venues, enriched_venues,
      config
    ) VALUES (
      ${config.provider},
      ${config.mode},
      ${config.region || config.city || 'Full UK'},
      'pending',
      ${cells.length},
      0, 0, 0, 0, 0, 0, 0,
      ${JSON.stringify(config)}
    )
    RETURNING id
  `
  return Number(rows[0].id)
}

// ─── Execute a run ───────────────────────────────────────────

export async function executeRun(runId: number): Promise<BackfillProgress> {
  const sql = getSQL()

  console.log('[v0] executeRun: starting run', runId)

  const runRows = await sql`SELECT * FROM backfill_runs WHERE id = ${runId}`
  if (runRows.length === 0) throw new Error(`Run ${runId} not found`)
  const run = runRows[0]

  const config: BackfillConfig = typeof run.config === 'string' ? JSON.parse(run.config) : run.config
  const cells = generateGrid(config)

  console.log('[v0] executeRun: run', runId, 'has', cells.length, 'cells, mode=', config.mode)

  await sql`
    UPDATE backfill_runs SET
      status = 'running', started_at = NOW(), total_cells = ${cells.length}
    WHERE id = ${runId}
  `

  let discovered = 0, inserted = 0, updated = 0, skipped = 0, failed = 0, enriched = 0
  const startCellIdx = Number(run.processed_cells) || 0

  // Global dedup across cells in this run
  const seenPlaceIds = new Set<string>()
  const existingBv = await sql`SELECT google_place_id FROM backfill_venues WHERE run_id = ${runId}`
  for (const v of existingBv) seenPlaceIds.add(v.google_place_id as string)

  let processedCells = startCellIdx

  try {
    for (let i = startCellIdx; i < cells.length; i++) {
      const cell = cells[i]
      let cellVenues: DiscoveredVenue[] = []

      console.log(`[v0] Cell ${i + 1}/${cells.length}: searching (${cell.lat}, ${cell.lng}) r=${cell.radiusMetres}m`)

      try {
        cellVenues = await searchCell(cell.lat, cell.lng, cell.radiusMetres)
        console.log(`[v0] Cell ${i + 1}: found ${cellVenues.length} venues`)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`[v0] Cell ${i + 1} search error:`, errMsg)
        failed++
        await sql`
          UPDATE backfill_runs SET
            failed_venues = ${failed},
            error_log = COALESCE(error_log, '') || ${`\nCell ${i} error: ${errMsg}`}
          WHERE id = ${runId}
        `
        processedCells = i + 1
        await sql`
          UPDATE backfill_runs SET processed_cells = ${processedCells}, updated_at = NOW()
          WHERE id = ${runId}
        `
        continue
      }

      for (const venue of cellVenues) {
        discovered++

        if (seenPlaceIds.has(venue.googlePlaceId)) {
          skipped++
          continue
        }
        seenPlaceIds.add(venue.googlePlaceId)

        // Coordinate-based UK filter -- reject venues outside UK bounds
        if (!isWithinUK(venue.lat, venue.lng)) {
          console.log(`[v0] Skipping non-UK venue by coordinates: ${venue.name} (${venue.lat}, ${venue.lng})`)
          skipped++
          continue
        }

        // Enrich if requested
        let enrichedData: Partial<DiscoveredVenue> = {}
        if (config.enrichDetails) {
          try {
            const details = await enrichVenue(venue.googlePlaceId)
            if (details) {
              // Check if enrichment flagged this as non-UK
              if ((details as Record<string, unknown>)._rejected) {
                console.log(`[v0] Skipping non-UK venue by enrichment: ${venue.name}`)
                skipped++
                continue
              }
              enrichedData = details
              enriched++
            }
          } catch (err) {
            console.error(`[v0] Enrich error for ${venue.name}:`, err instanceof Error ? err.message : err)
            // Continue with basic data
          }
        }

        const final = { ...venue, ...enrichedData }
        const venueSlug = slugify(final.name, final.city || config.city || config.region || 'uk')

        try {
          // Check if venue already exists by google_place_id
          const existingRows = await sql`SELECT id FROM venues WHERE google_place_id = ${final.googlePlaceId}`
          const isExisting = existingRows.length > 0

          let venueId: number

          if (isExisting) {
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
                enrichment_status = ${config.enrichDetails ? 'enriched' : 'basic'},
                updated_at = NOW()
              WHERE id = ${venueId}
            `
            updated++
            console.log(`[v0] Updated venue: ${final.name} (id=${venueId})`)
          } else {
            const insertRows = await sql`
              INSERT INTO venues (
                slug, name, lat, lng, address_line1, city, county, postcode, country,
                google_place_id, google_rating, google_review_count,
                phone, website, status, last_google_sync, confidence_score, enrichment_status
              ) VALUES (
                ${venueSlug}, ${final.name}, ${final.lat}, ${final.lng},
                ${final.address}, ${final.city || null}, ${final.county || null},
                ${final.postcode || null}, 'United Kingdom',
                ${final.googlePlaceId}, ${final.googleRating}, ${final.googleReviewCount},
                ${final.phone || null}, ${final.website || null},
                'active', NOW(),
                ${final.postcode ? 0.7 : 0.5},
                ${config.enrichDetails ? 'enriched' : 'basic'}
              )
              ON CONFLICT (google_place_id) DO UPDATE SET
                name = EXCLUDED.name,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                address_line1 = EXCLUDED.address_line1,
                google_rating = EXCLUDED.google_rating,
                google_review_count = EXCLUDED.google_review_count,
                last_google_sync = NOW(),
                updated_at = NOW()
              RETURNING id
            `
            venueId = Number(insertRows[0].id)
            inserted++
            console.log(`[v0] Inserted venue: ${final.name} (id=${venueId})`)
          }

          // Log in backfill_venues
          await sql`
            INSERT INTO backfill_venues (
              run_id, venue_id, google_place_id, status, confidence_score, enrichment_status, raw_data
            ) VALUES (
              ${runId}, ${venueId}, ${final.googlePlaceId},
              ${isExisting ? 'updated' : 'inserted'},
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

          // Photos -- store proxy URLs so API key isn't leaked to clients
          if (final.photoReferences && final.photoReferences.length > 0) {
            await sql`DELETE FROM venue_images WHERE venue_id = ${venueId} AND source = 'google'`
            for (let pi = 0; pi < final.photoReferences.length; pi++) {
              const photoUrl = `/api/venue-photo?ref=${final.photoReferences[pi]}&maxwidth=800`
              await sql`
                INSERT INTO venue_images (venue_id, url, alt, source, is_primary, attribution)
                VALUES (
                  ${venueId}, ${photoUrl},
                  ${`${final.name} - photo ${pi + 1}`},
                  'google', ${pi === 0}, 'Google Maps'
                )
              `
            }
            const primaryUrl = `/api/venue-photo?ref=${final.photoReferences[0]}&maxwidth=800`
            await sql`UPDATE venues SET image_url = ${primaryUrl} WHERE id = ${venueId}`
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error(`[v0] Venue insert/update error for ${final.name}:`, errMsg)
          failed++
          try {
            await sql`
              INSERT INTO backfill_venues (
                run_id, google_place_id, status, error_message, raw_data
              ) VALUES (
                ${runId}, ${final.googlePlaceId}, 'failed',
                ${errMsg},
                ${JSON.stringify(final)}
              )
              ON CONFLICT (run_id, google_place_id) DO UPDATE SET
                status = 'failed', error_message = EXCLUDED.error_message, updated_at = NOW()
            `
          } catch { /* best effort logging */ }
        }
      }

      processedCells = i + 1

      // Update progress after each cell
      await sql`
        UPDATE backfill_runs SET
          processed_cells = ${processedCells},
          venues_discovered = ${discovered}, venues_inserted = ${inserted},
          venues_updated = ${updated}, venues_skipped = ${skipped},
          failed_venues = ${failed}, enriched_venues = ${enriched}, updated_at = NOW()
        WHERE id = ${runId}
      `

      console.log(`[v0] Cell ${processedCells}/${cells.length} done. Totals: d=${discovered} i=${inserted} u=${updated} s=${skipped} f=${failed} e=${enriched}`)
    }

    // Mark completed
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

    console.log(`[v0] Run ${runId} completed successfully`)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[v0] Run ${runId} failed:`, errMsg)

    await sql`
      UPDATE backfill_runs SET
        status = 'failed',
        error_log = ${errMsg},
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
