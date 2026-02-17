import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAMES = [
  'Emma', 'Olivia', 'Sophie', 'Lily', 'Jessica', 'Amelia', 'Charlotte', 'Mia',
  'James', 'Oliver', 'Jack', 'Harry', 'George', 'Noah', 'Thomas', 'William',
  'Sarah', 'Hannah', 'Lucy', 'Katie', 'Rachel', 'Rebecca', 'Lauren', 'Chloe',
  'David', 'Daniel', 'Ben', 'Sam', 'Alex', 'Chris', 'Matt', 'Mark',
]
const SURNAMES = ['S', 'T', 'B', 'W', 'H', 'M', 'R', 'J', 'P', 'D', 'C', 'L', 'N', 'G', 'K']

function randomAuthor(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}.`
}

function getCategoryContext(category: string): string {
  switch (category) {
    case 'soft_play': return 'an indoor soft play centre for children'
    case 'playground': return 'a public outdoor playground and play area'
    case 'trampoline_park': return 'a trampoline park and activity centre'
    case 'adventure': return 'an adventure play centre with climbing and activities'
    case 'farm': return 'a farm park with animals and play areas for children'
    default: return "a children's play venue"
  }
}

/** Safely extract JSON from AI text response */
function parseJsonFromText(text: string): unknown {
  // Try direct parse
  try { return JSON.parse(text) } catch {}
  // Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch {}
  }
  // Try extracting first {...} block
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch {}
  }
  return null
}

// GET: Check progress stats
export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN description IS NOT NULL AND description != '' AND LENGTH(description) > 20 THEN 1 END) as with_desc,
      COUNT(CASE WHEN has_cafe OR has_parking OR has_party_rooms OR is_sen_friendly OR has_baby_area OR has_outdoor THEN 1 END) as with_facilities
    FROM venues WHERE status = 'active'
  `
  const [reviewStats] = await sql`
    SELECT COUNT(DISTINCT venue_id) as venues_with_reviews FROM reviews WHERE source = 'first_party'
  `
  return NextResponse.json({
    total: Number(stats.total),
    withDescription: Number(stats.with_desc),
    withFacilities: Number(stats.with_facilities),
    withReviews: Number(reviewStats.venues_with_reviews),
    missingDescription: Number(stats.total) - Number(stats.with_desc),
    missingFacilities: Number(stats.total) - Number(stats.with_facilities),
  })
}

export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }
  const batchSize = Math.min(Number(body.batchSize) || 20, 50)
  const offset = Number(body.offset) || 0
  const type = (body.type as string) || 'all'
  const venueId = body.venueId ? Number(body.venueId) : null

  let venues
  if (venueId) {
    venues = await sql`
      SELECT id, name, city, county, category, address_line1, postcode,
             google_rating, google_review_count, description,
             has_cafe, has_parking, has_party_rooms, is_sen_friendly,
             has_baby_area, has_outdoor
      FROM venues WHERE id = ${venueId} AND status = 'active'
    `
  } else {
    venues = await sql`
      SELECT id, name, city, county, category, address_line1, postcode,
             google_rating, google_review_count, description,
             has_cafe, has_parking, has_party_rooms, is_sen_friendly,
             has_baby_area, has_outdoor
      FROM venues WHERE status = 'active'
      ORDER BY id ASC
      LIMIT ${batchSize} OFFSET ${offset}
    `
  }

  if (venues.length === 0) {
    return NextResponse.json({ done: true, processed: 0, errors: 0, message: venueId ? 'Venue not found' : 'No more venues to process' })
  }

  // Process ALL venues synchronously -- no more fire-and-forget after()
  let processed = 0
  let errors = 0
  const errorDetails: string[] = []

  for (const venue of venues) {
    try {
      const vid = Number(venue.id)
      const categoryCtx = getCategoryContext(venue.category as string || 'soft_play')
      const venueName = venue.name as string
      const city = venue.city as string || 'the local area'
      const county = venue.county as string || ''

      // 1. Generate description
      if (type === 'all' || type === 'descriptions') {
        if (!venue.description || (venue.description as string).length < 20) {
          try {
            const descResult = await generateText({
              model: groq('llama-3.3-70b-versatile'),
              prompt: `Write a brief, informative 2-3 sentence description for "${venueName}", which is ${categoryCtx} located in ${city}${county ? `, ${county}` : ''}, UK. ` +
                `${venue.google_rating ? `It has a ${venue.google_rating}/5 Google rating.` : ''} ` +
                `Write in a warm, factual tone suitable for parents looking for children's activities. Do not use quotation marks around the venue name. Do not start with "Welcome to". Just describe what the venue offers.\n\n` +
                `Return ONLY a JSON object: {"description": "your text here"}`,
            })
            const parsed = parseJsonFromText(descResult.text) as { description?: string } | null
            if (parsed?.description && parsed.description.length > 20) {
              await sql`UPDATE venues SET description = ${parsed.description} WHERE id = ${vid}`
            }
          } catch (e) {
            errorDetails.push(`${venueName}: description failed - ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }

      // 2. Generate facilities
      if (type === 'all' || type === 'facilities') {
        const hasFacilities = venue.has_cafe || venue.has_parking || venue.has_party_rooms ||
                              venue.is_sen_friendly || venue.has_baby_area || venue.has_outdoor
        if (!hasFacilities) {
          try {
            const facResult = await generateText({
              model: groq('llama-3.3-70b-versatile'),
              prompt: `For "${venueName}", ${categoryCtx} in ${city}, UK, determine which facilities it likely has. ` +
                `Be realistic based on the type of venue. For public playgrounds: typically no cafe, free parking nearby, no party rooms, may have baby area. ` +
                `For soft play centres: typically cafe, parking, party rooms, baby area.\n\n` +
                `Return ONLY a JSON object with boolean values:\n` +
                `{"has_cafe": true/false, "has_parking": true/false, "has_party_rooms": true/false, "has_baby_area": true/false, "has_outdoor": true/false, "is_sen_friendly": true/false}`,
            })
            const fac = parseJsonFromText(facResult.text) as {
              has_cafe?: boolean; has_parking?: boolean; has_party_rooms?: boolean;
              has_baby_area?: boolean; has_outdoor?: boolean; is_sen_friendly?: boolean
            } | null
            if (fac && typeof fac.has_cafe === 'boolean') {
              await sql`UPDATE venues SET
                has_cafe = ${fac.has_cafe},
                has_parking = ${fac.has_parking ?? false},
                has_party_rooms = ${fac.has_party_rooms ?? false},
                has_baby_area = ${fac.has_baby_area ?? false},
                has_outdoor = ${fac.has_outdoor ?? false},
                is_sen_friendly = ${fac.is_sen_friendly ?? false}
              WHERE id = ${vid}`
            }
          } catch (e) {
            errorDetails.push(`${venueName}: facilities failed - ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }

      // 3. Generate reviews
      if (type === 'all' || type === 'reviews') {
        const existingReviews = await sql`SELECT COUNT(*) as cnt FROM reviews WHERE venue_id = ${vid} AND source = 'first_party'`
        const existingCount = Number(existingReviews[0]?.cnt) || 0

        if (existingCount < 3) {
          try {
            const reviewCount = 3 + Math.floor(Math.random() * 5) - existingCount
            if (reviewCount > 0) {
              const reviewResult = await generateText({
                model: groq('llama-3.3-70b-versatile'),
                prompt: `Write ${reviewCount} realistic parent reviews for "${venueName}", ${categoryCtx} in ${city}, UK. ` +
                  `${venue.google_rating ? `The venue has a ${venue.google_rating}/5 Google rating.` : ''} ` +
                  `Reviews should be from British parents who visited with their children. ` +
                  `Mix of very positive (4-5 stars) and a couple moderate (3-4 stars). Include specific details. ` +
                  `Each review: 1-3 sentences in natural British English ("brilliant", "lovely", "kids absolutely loved it"). ` +
                  `Do NOT mention the reviewer's name.\n\n` +
                  `Return ONLY a JSON object:\n` +
                  `{"reviews": [{"rating": 5, "comment": "...", "cleanliness_rating": 4, "value_rating": 5}, ...]}`,
              })
              const parsed = parseJsonFromText(reviewResult.text) as {
                reviews?: Array<{ rating: number; comment: string; cleanliness_rating: number; value_rating: number }>
              } | null
              if (parsed?.reviews && parsed.reviews.length > 0) {
                for (const review of parsed.reviews) {
                  const author = randomAuthor()
                  const daysAgo = Math.floor(Math.random() * 180) + 7
                  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
                  await sql`
                    INSERT INTO reviews (venue_id, source, author_name, rating, cleanliness_rating, value_rating, body, created_at)
                    VALUES (${vid}, 'first_party', ${author}, ${review.rating}, ${review.cleanliness_rating}, ${review.value_rating}, ${review.comment}, ${createdAt})
                  `
                }
                const avgRows = await sql`
                  SELECT AVG(rating) as avg_rating, COUNT(*) as cnt
                  FROM reviews WHERE venue_id = ${vid} AND source = 'first_party'
                `
                if (avgRows.length > 0) {
                  await sql`UPDATE venues SET
                    first_party_rating = ${Number(avgRows[0].avg_rating)},
                    first_party_review_count = ${Number(avgRows[0].cnt)}
                  WHERE id = ${vid}`
                }
              }
            }
          } catch (e) {
            errorDetails.push(`${venueName}: reviews failed - ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }

      processed++
    } catch (err) {
      errors++
      errorDetails.push(`${venue.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    done: venues.length < batchSize,
    processed,
    errors,
    errorDetails: errorDetails.slice(0, 20),
    nextOffset: offset + batchSize,
    message: errors > 0
      ? `Processed ${processed} venues with ${errors} errors`
      : `Successfully processed ${processed} venues`,
  })
}
