import { NextResponse } from 'next/server'
import { checkDbHealth } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dbUrlPresent = !!process.env.DATABASE_URL
  const dbUrlPrefix = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.substring(0, 20) + '...'
    : 'NOT SET'

  let db = { ok: false, venueCount: 0, latestSync: null as string | null }
  let dbError: string | null = null

  if (dbUrlPresent) {
    try {
      db = await checkDbHealth()
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error)
    }
  }

  const googlePlacesConfigured = !!process.env.GOOGLE_PLACES_API_KEY

  return NextResponse.json({
    status: db.ok ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        envVarPresent: dbUrlPresent,
        envVarPrefix: dbUrlPrefix,
        connected: db.ok,
        error: dbError,
        venueCount: db.venueCount,
        latestSync: db.latestSync,
      },
      googlePlaces: {
        configured: googlePlacesConfigured,
      },
    },
  })
}
