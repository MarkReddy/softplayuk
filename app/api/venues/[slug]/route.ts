import { NextResponse } from 'next/server'
import { getVenueBySlug } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const venue = await getVenueBySlug(slug)
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    return NextResponse.json(venue)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch venue', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
