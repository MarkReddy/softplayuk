import { NextResponse } from 'next/server'
import { getVenuesPaginated } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { venues, total } = await getVenuesPaginated(limit, offset)
    return NextResponse.json({
      venues,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Venues list API error:', error)
    return NextResponse.json({ error: 'Failed to list venues' }, { status: 500 })
  }
}
