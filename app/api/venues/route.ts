import { NextResponse } from 'next/server'
import { getVenuesPaginated, getVenuesByCity, getVenuesByRegion, searchVenuesByText } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const region = searchParams.get('region') || ''
  const city = searchParams.get('city') || ''
  const q = searchParams.get('q') || ''
  const postcode = searchParams.get('postcode') || ''

  try {
    // Text search takes priority
    if (q) {
      const venues = await searchVenuesByText(q)
      return NextResponse.json({
        venues,
        pagination: { total: venues.length, limit: venues.length, offset: 0, hasMore: false },
      })
    }

    // City filter
    if (city) {
      const cityName = city.replace(/-/g, ' ')
      const venues = await getVenuesByCity(cityName)
      return NextResponse.json({
        venues,
        pagination: { total: venues.length, limit: venues.length, offset: 0, hasMore: false },
      })
    }

    // Region filter
    if (region) {
      const venues = await getVenuesByRegion(region, limit)
      return NextResponse.json({
        venues,
        pagination: { total: venues.length, limit, offset: 0, hasMore: false },
      })
    }

    // Default: paginated list
    const { venues, total } = await getVenuesPaginated(limit, offset)
    return NextResponse.json({
      venues,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error('Venues list API error:', error)
    return NextResponse.json({ error: 'Failed to list venues' }, { status: 500 })
  }
}
