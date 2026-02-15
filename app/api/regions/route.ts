import { NextResponse } from 'next/server'
import { getAllRegions } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const regions = await getAllRegions()
    return NextResponse.json(
      { total: regions.length, regions },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch regions', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
