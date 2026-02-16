import { NextResponse } from 'next/server'
import { getRegionDetail } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const detail = await getRegionDetail(slug)
    if (!detail) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 })
    }
    return NextResponse.json(detail, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch region', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
