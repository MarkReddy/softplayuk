import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'GOOGLE_PLACES_API_KEY is not set. Add it in the Vars sidebar.',
    }, { status: 503 })
  }

  // Do a minimal Nearby Search for "soft play" in central Birmingham
  const params = new URLSearchParams({
    location: '52.4862,-1.8904',
    radius: '10000',
    keyword: 'soft play',
    type: 'establishment',
    key,
  })

  const start = Date.now()

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`)
    const data = await res.json()
    const duration = Date.now() - start

    return NextResponse.json({
      ok: data.status === 'OK' || data.status === 'ZERO_RESULTS',
      googleStatus: data.status,
      errorMessage: data.error_message || null,
      resultsCount: (data.results || []).length,
      sampleResults: (data.results || []).slice(0, 3).map((r: { name: string; place_id: string; vicinity: string; rating: number }) => ({
        name: r.name,
        placeId: r.place_id,
        vicinity: r.vicinity,
        rating: r.rating,
      })),
      durationMs: duration,
      keyPrefix: key.slice(0, 8) + '...',
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Network error calling Google API',
      durationMs: Date.now() - start,
    }, { status: 500 })
  }
}
