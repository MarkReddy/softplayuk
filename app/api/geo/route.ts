import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel provides geolocation via headers on deployed environments
  const headers = new Headers(request.headers)
  const lat = parseFloat(headers.get('x-vercel-ip-latitude') || '')
  const lng = parseFloat(headers.get('x-vercel-ip-longitude') || '')
  const city = headers.get('x-vercel-ip-city') || null
  const country = headers.get('x-vercel-ip-country') || null

  if (!isNaN(lat) && !isNaN(lng)) {
    return NextResponse.json({ lat, lng, city: city ? decodeURIComponent(city) : null, country })
  }

  // No geo data available
  return NextResponse.json({ lat: null, lng: null, city: null, country: null })
}
