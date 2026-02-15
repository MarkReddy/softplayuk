import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listRuns } from '@/lib/backfill/engine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  try {
    const runs = await listRuns(50)
    return NextResponse.json({ runs })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list runs' },
      { status: 500 },
    )
  }
}
