import { NextResponse } from 'next/server'
import { isValidUKPostcode } from '@/lib/data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const postcode = searchParams.get('postcode')

  if (!postcode || !isValidUKPostcode(postcode)) {
    return NextResponse.json(
      { error: 'Please enter a valid UK postcode' },
      { status: 400 },
    )
  }

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`,
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Postcode not found. Please check and try again.' },
        { status: 404 },
      )
    }

    const data = await res.json()

    return NextResponse.json({
      lat: data.result.latitude,
      lng: data.result.longitude,
      postcode: data.result.postcode,
      area: data.result.admin_district || data.result.region,
    })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
