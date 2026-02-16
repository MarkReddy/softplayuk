import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    const { venueId, authorName, rating, body: reviewBody, cleanlinessRating, valueRating, funRating } = body

    // Validate
    if (!venueId || !authorName || !rating || !reviewBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    if (authorName.length > 50 || reviewBody.length > 1000) {
      return NextResponse.json({ error: 'Name or review is too long' }, { status: 400 })
    }

    // Insert review
    await sql`
      INSERT INTO reviews (venue_id, source, author_name, rating, body, cleanliness_rating, value_rating, fun_rating, created_at)
      VALUES (${Number(venueId)}, 'first_party', ${authorName}, ${rating}, ${reviewBody}, ${cleanlinessRating}, ${valueRating}, ${funRating}, NOW())
    `

    // Update venue first_party_rating and first_party_review_count
    await sql`
      UPDATE venues SET
        first_party_review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id = ${Number(venueId)} AND source = 'first_party'),
        first_party_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE venue_id = ${Number(venueId)} AND source = 'first_party')
      WHERE id = ${Number(venueId)}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review submission error:', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
