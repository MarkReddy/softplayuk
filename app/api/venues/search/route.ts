import { NextResponse } from 'next/server'
import { searchVenuesByText } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: 'Query parameter "q" must be at least 2 characters' },
      { status: 400 },
    )
  }

  try {
    const venues = await searchVenuesByText(q)
    return NextResponse.json({ query: q, count: venues.length, venues })
  } catch (error) {
    console.error('Venues search API error:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}
