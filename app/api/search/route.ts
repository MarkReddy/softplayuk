import { NextResponse } from 'next/server'
import { searchVenues, getAllVenues } from '@/lib/db'
import { getBlendedRating } from '@/lib/data'
import type { SearchResult } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseFloat(searchParams.get('radius') || '10')
  const sortBy = searchParams.get('sortBy') || 'rating'
  const ageGroup = searchParams.get('ageGroup')
  const priceBand = searchParams.get('priceBand')
  const senFriendly = searchParams.get('senFriendly')
  const hasParking = searchParams.get('hasParking')
  const hasCafe = searchParams.get('hasCafe')

  try {
    let results: SearchResult[]

    if (!lat && !lng) {
      // No location -- return all venues with distance 0
      const all = await getAllVenues()
      results = all.map((v) => ({ ...v, distance: 0 }))
    } else {
      // Distance-based search from Neon (Haversine in SQL)
      results = await searchVenues(lat, lng, radius)
    }

    // Apply client-side filters on the hydrated results
    if (ageGroup) {
      const [min, max] = ageGroup.split('-').map(Number)
      results = results.filter(
        (v) => v.ageRange.min <= min && v.ageRange.max >= max,
      )
    }

    if (priceBand) {
      results = results.filter((v) => v.priceBand === parseInt(priceBand))
    }

    if (senFriendly === 'true') {
      results = results.filter((v) => v.senFriendly)
    }

    if (hasParking === 'true') {
      results = results.filter((v) =>
        v.amenities.some((a) => a.id === 'parking'),
      )
    }

    if (hasCafe === 'true') {
      results = results.filter((v) =>
        v.amenities.some((a) => a.id === 'cafe'),
      )
    }

    // Sort
    if (sortBy === 'distance') {
      results.sort((a, b) => a.distance - b.distance)
    } else if (sortBy === 'price') {
      results.sort((a, b) => a.priceBand - b.priceBand)
    } else if (sortBy === 'cleanliness') {
      results.sort((a, b) => b.cleanlinessScore - a.cleanlinessScore)
    } else {
      results.sort((a, b) => getBlendedRating(b) - getBlendedRating(a))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('[v0] Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search venues' },
      { status: 500 },
    )
  }
}
