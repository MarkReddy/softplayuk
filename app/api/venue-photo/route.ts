import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Proxies Google Places photos so the API key isn't leaked to clients.
 * Usage: /api/venue-photo?ref=PHOTO_REFERENCE&maxwidth=800
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')
  const maxwidth = searchParams.get('maxwidth') || '800'

  if (!ref) {
    return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 })
  }

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 })
  }

  const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${key}`

  try {
    const res = await fetch(googleUrl, { redirect: 'follow' })
    if (!res.ok) {
      return NextResponse.json({ error: 'Photo fetch failed' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Photo proxy error' }, { status: 500 })
  }
}
