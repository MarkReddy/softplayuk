import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { getAllRuns } from '@/lib/backfill/engine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  try {
    const runs = await getAllRuns()
    return NextResponse.json({ runs })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
