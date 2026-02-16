import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createRun, executeRun } from '@/lib/backfill/engine'
import { generateGrid, type BackfillConfig, type BackfillMode } from '@/lib/backfill/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  try {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY is not configured. Add it in the Vars sidebar.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const mode = (body.mode || 'region') as BackfillMode
    const region = body.region as string | undefined
    const city = body.city as string | undefined
    const enrichDetails = body.enrichDetails !== false
    const dryRun = body.dryRun === true

    if (mode === 'region' && !region) {
      return NextResponse.json({ error: 'region is required for region mode' }, { status: 400 })
    }
    if (mode === 'city' && !city) {
      return NextResponse.json({ error: 'city is required for city mode' }, { status: 400 })
    }

    const config: BackfillConfig = {
      mode,
      provider: 'google_places',
      region,
      city,
      enrichDetails,
      dryRun,
    }

    if (dryRun) {
      const cells = generateGrid(config)
      return NextResponse.json({
        dryRun: true,
        mode,
        region: region || city || 'Full UK',
        totalCells: cells.length,
        sampleCells: cells.slice(0, 10),
      })
    }

    console.log('[v0] Creating backfill run with config:', JSON.stringify(config))
    const runId = await createRun(config)
    console.log('[v0] Created run', runId, '- starting execution')

    // Await execution directly. maxDuration=300 keeps the function alive for up to 5 min.
    // The dashboard polls /api/admin/backfill/runs for live progress during execution.
    const result = await executeRun(runId)

    console.log('[v0] Run', runId, 'finished with status:', result.status,
      '| discovered:', result.discovered, '| inserted:', result.inserted,
      '| updated:', result.updated, '| failed:', result.failed)

    return NextResponse.json({
      runId,
      status: result.status,
      discovered: result.discovered,
      inserted: result.inserted,
      updated: result.updated,
      enriched: result.enriched,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    })
  } catch (err) {
    console.error('[v0] Backfill start error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start backfill' },
      { status: 500 },
    )
  }
}
