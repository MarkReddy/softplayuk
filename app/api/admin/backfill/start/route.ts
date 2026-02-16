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

    const runId = await createRun(config)

    // Stream the execution as SSE so the Vercel function stays alive.
    // The function runs for up to maxDuration (300s / 5 min).
    // The dashboard polls /api/admin/backfill/runs for live progress anyway,
    // but we must keep THIS request alive or Vercel kills executeRun().
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Send the initial runId immediately so the client can navigate
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ runId, status: 'started' })}\n\n`),
        )

        try {
          const result = await executeRun(runId)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ runId, status: result.status, discovered: result.discovered, inserted: result.inserted, updated: result.updated, enriched: result.enriched, failed: result.failed })}\n\n`,
            ),
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ runId, status: 'failed', error: err instanceof Error ? err.message : String(err) })}\n\n`,
            ),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[v0] Backfill start error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start backfill' },
      { status: 500 },
    )
  }
}
