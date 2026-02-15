import { NextResponse } from 'next/server'
import { getVenueCount } from '@/lib/db'

export async function GET() {
  try {
    const count = await getVenueCount()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Count API error:', error)
    return NextResponse.json({ error: 'Failed to get venue count' }, { status: 500 })
  }
}
