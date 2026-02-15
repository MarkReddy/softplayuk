import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getRunProgress, getRunVenues } from '@/lib/backfill/engine'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const runId = Number(id)
  if (isNaN(runId)) {
    return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 })
  }

  try {
    const progress = await getRunProgress(runId)
    const venueLog = await getRunVenues(runId)

    return NextResponse.json({ progress, venueLog })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Run not found' },
      { status: 500 },
    )
  }
}
