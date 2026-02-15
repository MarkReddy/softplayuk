import { NextResponse } from 'next/server'
import { getAllDistinctCities } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.max(1, Math.min(20000, Number(limitParam))) : undefined
    const offset = offsetParam ? Math.max(0, Number(offsetParam)) : undefined

    const { total, cities } = await getAllDistinctCities(limit, offset)

    return NextResponse.json(
      { total, returned: cities.length, cities },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch cities', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
