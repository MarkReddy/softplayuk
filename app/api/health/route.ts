import { NextResponse } from 'next/server'
import { checkDbHealth } from '@/lib/db'

export async function GET() {
  const db = await checkDbHealth()

  const googlePlacesConfigured = !!process.env.GOOGLE_PLACES_API_KEY

  return NextResponse.json({
    status: db.ok ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        connected: db.ok,
        venueCount: db.venueCount,
        latestSync: db.latestSync,
      },
      googlePlaces: {
        configured: googlePlacesConfigured,
        // Never expose the actual key
      },
    },
  })
}
