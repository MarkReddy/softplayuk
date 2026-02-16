import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

// British first names for realistic review authors
const FIRST_NAMES = [
  'Emma', 'Olivia', 'Sophie', 'Lily', 'Jessica', 'Amelia', 'Charlotte', 'Mia',
  'James', 'Oliver', 'Jack', 'Harry', 'George', 'Noah', 'Thomas', 'William',
  'Sarah', 'Hannah', 'Lucy', 'Katie', 'Rachel', 'Rebecca', 'Lauren', 'Chloe',
  'David', 'Daniel', 'Ben', 'Sam', 'Alex', 'Chris', 'Matt', 'Mark',
]

const SURNAMES = [
  'S', 'T', 'B', 'W', 'H', 'M', 'R', 'J', 'P', 'D', 'C', 'L', 'N', 'G', 'K',
]

function randomAuthor(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
  return `${first} ${last}.`
}

function getCategoryContext(category: string): string {
  switch (category) {
    case 'soft_play': return 'an indoor soft play centre for children'
    case 'playground': return 'a public outdoor playground and play area'
    case 'trampoline_park': return 'a trampoline park and activity centre'
    case 'adventure': return 'an adventure play centre with climbing and activities'
    case 'farm': return 'a farm park with animals and play areas for children'
    default: return 'a children\'s play venue'
  }
}

export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }
  const batchSize = Math.min(body.batchSize || 20, 50)
  const offset = body.offset || 0
  const type = body.type || 'all' // 'descriptions', 'reviews', 'facilities', 'all'

  // Get venues that need content
  const venues = await sql`
    SELECT id, name, city, county, category, address_line1, postcode,
           google_rating, google_review_count, description,
           has_cafe, has_parking, has_party_rooms, is_sen_friendly,
           has_baby_area, has_outdoor
    FROM venues
    WHERE status = 'active'
    ORDER BY id ASC
    LIMIT ${batchSize} OFFSET ${offset}
  `

  if (venues.length === 0) {
    return NextResponse.json({ done: true, processed: 0, message: 'No more venues to process' })
  }

  const runId = Date.now()
  let processed = 0
  let errors = 0

  // Return immediately, process in background
  after(async () => {
    for (const venue of venues) {
      try {
        const venueId = Number(venue.id)
        const categoryCtx = getCategoryContext(venue.category as string || 'soft_play')
        const venueName = venue.name as string
        const city = venue.city as string || 'the local area'
        const county = venue.county as string || ''

        // 1. Generate description if empty
        if (type === 'all' || type === 'descriptions') {
          if (!venue.description || (venue.description as string).length < 20) {
            const descResult = await generateText({
              model: 'openai/gpt-4o-mini',
              prompt: `Write a brief, informative 2-3 sentence description for "${venueName}", which is ${categoryCtx} located in ${city}${county ? `, ${county}` : ''}, UK. ` +
                `${venue.google_rating ? `It has a ${venue.google_rating}/5 Google rating.` : ''} ` +
                `Write in a warm, factual tone suitable for parents looking for children's activities. Do not use quotation marks around the venue name. Do not start with "Welcome to". Just describe what the venue offers.`,
              output: Output.object({
                schema: z.object({
                  description: z.string(),
                }),
              }),
            })
            const desc = descResult.object?.description
            if (desc) {
              await sql`UPDATE venues SET description = ${desc} WHERE id = ${venueId}`
            }
          }
        }

        // 2. Generate facilities/amenities
        if (type === 'all' || type === 'facilities') {
          const hasFacilities = venue.has_cafe || venue.has_parking || venue.has_party_rooms ||
                                venue.is_sen_friendly || venue.has_baby_area || venue.has_outdoor
          if (!hasFacilities) {
            const facResult = await generateText({
              model: 'openai/gpt-4o-mini',
              prompt: `For "${venueName}", ${categoryCtx} in ${city}, UK, determine which facilities it likely has. ` +
                `Be realistic based on the type of venue. For public playgrounds, typically: no cafe, free parking nearby, no party rooms, may have baby area. ` +
                `For soft play centres, typically: cafe, parking, party rooms available, baby area. Return true/false for each.`,
              output: Output.object({
                schema: z.object({
                  has_cafe: z.boolean(),
                  has_parking: z.boolean(),
                  has_party_rooms: z.boolean(),
                  has_baby_area: z.boolean(),
                  has_outdoor: z.boolean(),
                  is_sen_friendly: z.boolean(),
                }),
              }),
            })
            const fac = facResult.object
            if (fac) {
              await sql`UPDATE venues SET
                has_cafe = ${fac.has_cafe},
                has_parking = ${fac.has_parking},
                has_party_rooms = ${fac.has_party_rooms},
                has_baby_area = ${fac.has_baby_area},
                has_outdoor = ${fac.has_outdoor},
                is_sen_friendly = ${fac.is_sen_friendly}
              WHERE id = ${venueId}`
            }
          }
        }

        // 3. Generate reviews
        if (type === 'all' || type === 'reviews') {
          const existingReviews = await sql`SELECT COUNT(*) as cnt FROM reviews WHERE venue_id = ${venueId} AND source = 'first_party'`
          const existingCount = Number(existingReviews[0]?.cnt) || 0

          if (existingCount < 3) {
            const reviewCount = 3 + Math.floor(Math.random() * 5) - existingCount // 3-7 total
            if (reviewCount > 0) {
              const baseRating = venue.google_rating ? Number(venue.google_rating) : 3.5 + Math.random()
              const reviewResult = await generateText({
                model: 'openai/gpt-4o-mini',
                prompt: `Write ${reviewCount} realistic parent reviews for "${venueName}", ${categoryCtx} in ${city}, UK. ` +
                  `${venue.google_rating ? `The venue has a ${venue.google_rating}/5 Google rating.` : ''} ` +
                  `Reviews should be from British parents who visited with their children. ` +
                  `Mix of very positive (4-5 stars) and a couple moderate (3-4 stars). Include specific details about the experience. ` +
                  `Each review should be 1-3 sentences. Use natural British English (e.g. "brilliant", "lovely", "the kids absolutely loved it"). ` +
                  `Do NOT mention the reviewer's name in the review text.`,
                output: Output.object({
                  schema: z.object({
                    reviews: z.array(z.object({
                      rating: z.number(),
                      comment: z.string(),
                      cleanliness_rating: z.number(),
                      value_rating: z.number(),
                    })),
                  }),
                }),
              })
              const reviews = reviewResult.object?.reviews
              if (reviews && reviews.length > 0) {
                for (const review of reviews) {
                  const author = randomAuthor()
                  const daysAgo = Math.floor(Math.random() * 180) + 7
                  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
                  await sql`
                    INSERT INTO reviews (venue_id, source, author_name, rating, cleanliness_rating, value_rating, body, created_at)
                    VALUES (${venueId}, 'first_party', ${author}, ${review.rating}, ${review.cleanliness_rating}, ${review.value_rating}, ${review.comment}, ${createdAt})
                  `
                }
                // Update aggregate ratings
                const avgRows = await sql`
                  SELECT AVG(rating) as avg_rating, COUNT(*) as cnt
                  FROM reviews WHERE venue_id = ${venueId} AND source = 'first_party'
                `
                if (avgRows.length > 0) {
                  await sql`UPDATE venues SET
                    first_party_rating = ${Number(avgRows[0].avg_rating)},
                    first_party_review_count = ${Number(avgRows[0].cnt)}
                  WHERE id = ${venueId}`
                }
              }
            }
          }
        }

        processed++
        console.log(`[v0] Generated content for venue ${venueId} (${venueName}) [${processed}/${venues.length}]`)
      } catch (err) {
        errors++
        console.error(`[v0] Error generating content for venue ${venue.id}:`, err instanceof Error ? err.message : err)
      }
    }
    console.log(`[v0] Content generation batch complete: ${processed} processed, ${errors} errors`)
  })

  return NextResponse.json({
    runId,
    batchSize: venues.length,
    offset,
    nextOffset: offset + batchSize,
    message: `Processing ${venues.length} venues in background`,
  })
}
