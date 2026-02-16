import { NextResponse } from 'next/server'
import { searchVenues } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Leamington Spa CV32 6EX fallback
const DEFAULT_LAT = 52.2852
const DEFAULT_LNG = -1.5364
const DEFAULT_RADIUS = 25 // miles

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const lat = parseFloat(searchParams.get('lat') || '') || DEFAULT_LAT
  const lng = parseFloat(searchParams.get('lng') || '') || DEFAULT_LNG
  const radius = Math.min(parseFloat(searchParams.get('radius') || '') || DEFAULT_RADIUS, 50)
  const limit = Math.min(parseInt(searchParams.get('limit') || '') || 6, 20)
  const category = searchParams.get('category') || undefined

  // Determine location label
  const isDefault = lat === DEFAULT_LAT && lng === DEFAULT_LNG
  const locationLabel = searchParams.get('label') || (isDefault ? 'Leamington Spa' : 'you')

  try {
    const venues = await searchVenues(lat, lng, radius, category)
    const limited = venues.slice(0, limit)

    return NextResponse.json({
      lat,
      lng,
      radius,
      locationLabel,
      isDefault,
      count: limited.length,
      venues: limited,
    })
  } catch (error) {
    console.error('Nearby venues API error:', error)
    return NextResponse.json({ error: 'Failed to fetch nearby venues' }, { status: 500 })
  }
}
