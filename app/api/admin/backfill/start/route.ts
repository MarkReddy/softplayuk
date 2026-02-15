import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { createRun, executeRun } from '@/lib/backfill/engine'
import type { BackfillConfig } from '@/lib/backfill/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel

// Preset regions
const PRESETS: Record<string, Pick<BackfillConfig, 'boundingBox' | 'regionLabel'>> = {
  west_midlands: {
    regionLabel: 'West Midlands',
    boundingBox: { north: 52.65, south: 52.30, east: -1.60, west: -2.20 },
  },
  greater_london: {
    regionLabel: 'Greater London',
    boundingBox: { north: 51.70, south: 51.30, east: 0.30, west: -0.55 },
  },
  greater_manchester: {
    regionLabel: 'Greater Manchester',
    boundingBox: { north: 53.60, south: 53.30, east: -2.00, west: -2.50 },
  },
  uk_full: {
    regionLabel: 'United Kingdom (Full)',
    boundingBox: { north: 58.7, south: 49.9, east: 1.8, west: -8.2 },
  },
  birmingham_30mi: {
    regionLabel: 'Birmingham (30 mile radius)',
    boundingBox: { north: 52.92, south: 52.05, east: -1.33, west: -2.47 },
  },
  custom: {
    regionLabel: 'Custom Region',
    boundingBox: { north: 0, south: 0, east: 0, west: 0 },
  },
}

export async function POST(request: Request) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const preset = body.preset as string
    const presetConfig = PRESETS[preset]

    if (!presetConfig && preset !== 'custom') {
      return NextResponse.json(
        { error: 'Invalid preset', available: Object.keys(PRESETS) },
        { status: 400 },
      )
    }

    const config: BackfillConfig = {
      provider: body.provider || 'google_places',
      regionLabel: body.regionLabel || presetConfig?.regionLabel || 'Custom',
      boundingBox: body.boundingBox || presetConfig?.boundingBox,
      gridStepKm: body.gridStepKm || 25,
      searchRadiusKm: body.searchRadiusKm || 16,
      searchKeywords: body.searchKeywords || ['soft play', 'indoor play centre'],
    }

    if (!config.boundingBox || config.boundingBox.north === 0) {
      return NextResponse.json({ error: 'Bounding box required for custom preset' }, { status: 400 })
    }

    // Validate Google Places API key is set
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY is not configured. Add it to your environment variables.' },
        { status: 503 },
      )
    }

    const runId = await createRun(config)

    // Fire and forget -- execute in the background
    executeRun(runId).catch((err) => {
      console.error(`[backfill] Run ${runId} failed:`, err)
    })

    return NextResponse.json({
      runId,
      status: 'started',
      region: config.regionLabel,
      message: `Backfill run #${runId} started for ${config.regionLabel}`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
