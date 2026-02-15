import { neon } from '@neondatabase/serverless'
import type { BackfillConfig, BackfillProvider, BackfillRun, DiscoveredVenue } from './types'
import { GooglePlacesProvider } from './google-places-provider'

function getSQL() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return neon(url)
}

function getProvider(name: string): BackfillProvider {
  switch (name) {
    case 'google_places':
      return new GooglePlacesProvider()
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

function generateGrid(config: BackfillConfig): { lat: number; lng: number }[] {
  const { north, south, east, west } = config.boundingBox
  const stepDeg = config.gridStepKm / 111 // ~111 km per degree latitude
  const cells: { lat: number; lng: number }[] = []

  for (let lat = south; lat <= north; lat += stepDeg) {
    const lngStep = stepDeg / Math.cos((lat * Math.PI) / 180)
    for (let lng = west; lng <= east; lng += lngStep) {
      cells.push({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) })
    }
  }
  return cells
}

/** Create a new backfill run record */
export async function createRun(config: BackfillConfig): Promise<number> {
  const sql = getSQL()
  const cells = generateGrid(config)

  const rows = await sql`
    INSERT INTO backfill_runs (provider, region_label, status, total_cells, config)
    VALUES (${config.provider}, ${config.regionLabel}, 'pending', ${cells.length}, ${JSON.stringify(config)})
    RETURNING id
  `
  return Number(rows[0].id)
}

/** Execute a backfill run (call from API route, runs async) */
export async function executeRun(runId: number): Promise<void> {
  const sql = getSQL()

  // Load run
  const runRows = await sql`SELECT * FROM backfill_runs WHERE id = ${runId}`
  if (!runRows[0]) throw new Error(`Run ${runId} not found`)

  const config: BackfillConfig = JSON.parse(runRows[0].config as string)
  const provider = getProvider(config.provider)
  const cells = generateGrid(config)

  // Mark running
  await sql`UPDATE backfill_runs SET status = 'running', started_at = NOW() WHERE id = ${runId}`

  let discovered = 0
  let inserted = 0
  let updated = 0
  let skipped = 0
  let completedCells = 0
  const errors: string[] = []

  for (const cell of cells) {
    try {
      const radiusMetres = config.searchRadiusKm * 1000
      const venues = await provider.searchArea(cell.lat, cell.lng, radiusMetres)
      discovered += venues.length

      for (const venue of venues) {
        try {
          const result = await upsertVenue(sql, provider, venue, runId)
          if (result === 'inserted') inserted++
          else if (result === 'updated') updated++
          else skipped++
        } catch (err) {
          skipped++
          const msg = `Venue ${venue.name}: ${err instanceof Error ? err.message : String(err)}`
          if (errors.length < 100) errors.push(msg)
        }
      }

      completedCells++

      // Update progress every cell
      await sql`
        UPDATE backfill_runs SET
          completed_cells = ${completedCells},
          venues_discovered = ${discovered},
          venues_inserted = ${inserted},
          venues_updated = ${updated},
          venues_skipped = ${skipped},
          errors = ${JSON.stringify(errors)}
        WHERE id = ${runId}
      `
    } catch (err) {
      completedCells++
      const msg = `Cell (${cell.lat},${cell.lng}): ${err instanceof Error ? err.message : String(err)}`
      if (errors.length < 100) errors.push(msg)
    }
  }

  // Mark completed
  await sql`
    UPDATE backfill_runs SET
      status = 'completed',
      completed_at = NOW(),
      completed_cells = ${completedCells},
      venues_discovered = ${discovered},
      venues_inserted = ${inserted},
      venues_updated = ${updated},
      venues_skipped = ${skipped},
      errors = ${JSON.stringify(errors)}
    WHERE id = ${runId}
  `
}

async function upsertVenue(
  sql: ReturnType<typeof neon>,
  provider: BackfillProvider,
  venue: DiscoveredVenue,
  runId: number,
): Promise<'inserted' | 'updated' | 'skipped'> {
  // Check if venue already exists by google_place_id
  const existing = await sql`
    SELECT id, google_place_id FROM venues WHERE google_place_id = ${venue.externalId}
  `

  // Fetch full details to enrich
  let enriched: DiscoveredVenue | null = null
  try {
    enriched = await provider.getDetails(venue.externalId)
  } catch {
    // Use basic data if detail fetch fails
  }
  const v = enriched || venue

  const slug = generateSlug(v.name, v.city || v.postcode)
  const priceBand = v.priceLevel != null ? mapPriceBand(v.priceLevel) : null

  if (existing.length > 0) {
    // Update existing venue
    const venueId = Number(existing[0].id)
    await sql`
      UPDATE venues SET
        name = ${v.name},
        address_line1 = COALESCE(NULLIF(${v.addressLine1}, ''), address_line1),
        city = COALESCE(NULLIF(${v.city}, ''), city),
        county = COALESCE(NULLIF(${v.county || ''}, ''), county),
        postcode = COALESCE(NULLIF(${v.postcode}, ''), postcode),
        lat = ${v.lat},
        lng = ${v.lng},
        phone = COALESCE(${v.phone || null}, phone),
        website = COALESCE(${v.website || null}, website),
        google_rating = COALESCE(${v.googleRating || null}, google_rating),
        google_review_count = COALESCE(${v.googleReviewCount || null}, google_review_count),
        price_band = COALESCE(${priceBand}, price_band),
        description = COALESCE(NULLIF(${v.description || ''}, ''), description),
        last_google_sync = NOW(),
        updated_at = NOW()
      WHERE id = ${venueId}
    `

    // Track in backfill_venues
    await sql`
      INSERT INTO backfill_venues (run_id, venue_id, google_place_id, action)
      VALUES (${runId}, ${venueId}, ${v.externalId}, 'updated')
      ON CONFLICT DO NOTHING
    `

    // Upsert opening hours if available
    if (v.openingHours && v.openingHours.length > 0) {
      await sql`DELETE FROM venue_opening_hours WHERE venue_id = ${venueId}`
      for (const h of v.openingHours) {
        await sql`
          INSERT INTO venue_opening_hours (venue_id, day, open_time, close_time)
          VALUES (${venueId}, ${h.day}, ${h.open}, ${h.close})
        `
      }
    }

    return 'updated'
  } else {
    // Insert new venue
    const insertRows = await sql`
      INSERT INTO venues (
        name, slug, address_line1, city, county, postcode, country,
        lat, lng, phone, website, google_place_id,
        google_rating, google_review_count, price_band,
        description, status, last_google_sync
      ) VALUES (
        ${v.name}, ${slug}, ${v.addressLine1}, ${v.city}, ${v.county || null}, ${v.postcode},
        'United Kingdom', ${v.lat}, ${v.lng}, ${v.phone || null}, ${v.website || null},
        ${v.externalId}, ${v.googleRating || null}, ${v.googleReviewCount || null},
        ${priceBand}, ${v.description || null}, 'active', NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        google_place_id = EXCLUDED.google_place_id,
        last_google_sync = NOW()
      RETURNING id
    `
    const venueId = Number(insertRows[0].id)

    // Track in backfill_venues
    await sql`
      INSERT INTO backfill_venues (run_id, venue_id, google_place_id, action)
      VALUES (${runId}, ${venueId}, ${v.externalId}, 'inserted')
      ON CONFLICT DO NOTHING
    `

    // Insert opening hours
    if (v.openingHours) {
      for (const h of v.openingHours) {
        await sql`
          INSERT INTO venue_opening_hours (venue_id, day, open_time, close_time)
          VALUES (${venueId}, ${h.day}, ${h.open}, ${h.close})
        `
      }
    }

    // Insert photos
    if (v.photos) {
      for (let i = 0; i < v.photos.length; i++) {
        await sql`
          INSERT INTO venue_images (venue_id, url, alt_text, source, attribution, sort_order)
          VALUES (${venueId}, ${v.photos[i].url}, ${v.name}, 'google_places', ${v.photos[i].attribution}, ${i})
        `
      }
    }

    // Insert source record
    await sql`
      INSERT INTO venue_sources (venue_id, source_type, source_id, last_fetched_at)
      VALUES (${venueId}, 'google_places', ${v.externalId}, NOW())
      ON CONFLICT DO NOTHING
    `

    return 'inserted'
  }
}

function generateSlug(name: string, city: string): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  // Add a short random suffix to avoid collisions
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function mapPriceBand(priceLevel: number): string {
  if (priceLevel <= 1) return 'budget'
  if (priceLevel === 2) return 'mid'
  return 'premium'
}

/** Get a run by ID */
export async function getRun(runId: number): Promise<BackfillRun | null> {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM backfill_runs WHERE id = ${runId}`
  if (!rows[0]) return null
  return mapRun(rows[0])
}

/** Get all runs, newest first */
export async function getAllRuns(): Promise<BackfillRun[]> {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM backfill_runs ORDER BY created_at DESC LIMIT 50`
  return rows.map(mapRun)
}

/** Get venues affected by a specific run */
export async function getRunVenues(runId: number): Promise<Array<{ venueId: number; googlePlaceId: string; action: string; name?: string; city?: string }>> {
  const sql = getSQL()
  const rows = await sql`
    SELECT bv.*, v.name, v.city
    FROM backfill_venues bv
    LEFT JOIN venues v ON v.id = bv.venue_id
    WHERE bv.run_id = ${runId}
    ORDER BY bv.created_at DESC
    LIMIT 500
  `
  return rows.map((r) => ({
    venueId: Number(r.venue_id),
    googlePlaceId: r.google_place_id as string,
    action: r.action as string,
    name: r.name as string | undefined,
    city: r.city as string | undefined,
  }))
}

function mapRun(row: Record<string, unknown>): BackfillRun {
  return {
    id: Number(row.id),
    provider: row.provider as string,
    regionLabel: row.region_label as string,
    status: row.status as BackfillRun['status'],
    totalCells: Number(row.total_cells),
    completedCells: Number(row.completed_cells),
    venuesDiscovered: Number(row.venues_discovered),
    venuesInserted: Number(row.venues_inserted),
    venuesUpdated: Number(row.venues_updated),
    venuesSkipped: Number(row.venues_skipped),
    errors: (() => { try { return JSON.parse(row.errors as string) } catch { return [] } })(),
    config: (() => { try { return JSON.parse(row.config as string) } catch { return {} as BackfillConfig } })(),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
  }
}
