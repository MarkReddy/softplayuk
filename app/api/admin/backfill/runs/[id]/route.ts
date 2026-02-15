import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { getRun, getRunVenues } from '@/lib/backfill/engine'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const { id } = await params
  const runId = Number(id)
  if (isNaN(runId)) {
    return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 })
  }

  try {
    const run = await getRun(runId)
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const venues = await getRunVenues(runId)

    return NextResponse.json({ run, venues })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
