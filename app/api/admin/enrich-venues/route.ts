import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

// ── Helpers ──────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ])
}

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

function parseJsonFromText(text: string): unknown {
  try { return JSON.parse(text) } catch { /* continue */ }
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch { /* continue */ }
  }
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = text.slice(braceStart, braceEnd + 1)
    try { return JSON.parse(candidate) } catch { /* continue */ }
    try {
      let fixed = ''
      let inString = false
      let escaped = false
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i]
        if (escaped) { fixed += ch; escaped = false; continue }
        if (ch === '\\') { fixed += ch; escaped = true; continue }
        if (ch === '"') { inString = !inString; fixed += ch; continue }
        if (inString && ch === '\n') { fixed += '\\n'; continue }
        if (inString && ch === '\r') { continue }
        if (inString && ch === '\t') { fixed += '\\t'; continue }
        fixed += ch
      }
      return JSON.parse(fixed)
    } catch { /* continue */ }
  }
  return null
}

// ── Types ────────────────────────────────────────────────────

interface EnrichmentResult {
  description: string
  facilities: {
    has_cafe: boolean
    has_parking: boolean
    has_party_rooms: boolean
    has_baby_area: boolean
    has_outdoor: boolean
    is_sen_friendly: boolean
  }
  hours: Array<{
    day: number
    open: string
    close: string
    closed: boolean
  }>
  reviews: Array<{
    rating: number
    comment: string
    cleanliness: number
    value: number
    fun: number
  }>
}

// ── GET: Enrichment progress stats ───────────────────────────

export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN enrichment_status = 'complete' THEN 1 END) as enriched,
      COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 20 THEN 1 END) as with_desc,
      COUNT(CASE WHEN has_cafe OR has_parking OR has_party_rooms OR is_sen_friendly OR has_baby_area OR has_outdoor THEN 1 END) as with_facilities
    FROM venues WHERE status = 'active'
  `
  const [reviewStats] = await sql`
    SELECT COUNT(DISTINCT venue_id) as venues_with_reviews FROM reviews WHERE source = 'first_party'
  `
  const [hourStats] = await sql`
    SELECT COUNT(DISTINCT venue_id) as venues_with_hours FROM venue_opening_hours WHERE NOT is_closed
  `

  return NextResponse.json({
    total: Number(stats.total),
    enriched: Number(stats.enriched),
    withDescription: Number(stats.with_desc),
    withFacilities: Number(stats.with_facilities),
    withReviews: Number(reviewStats.venues_with_reviews),
    withHours: Number(hourStats.venues_with_hours),
    remaining: Number(stats.total) - Number(stats.enriched),
  })
}

// ── POST: Process a batch ────────────────────────────────────

export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }

  const batchSize = Math.min(Number(body.batchSize) || 5, 10)

  // Fetch the next batch of unenriched venues
  const venues = await sql`
    SELECT id, name, city, county, category, address_line1, postcode,
           google_rating, google_review_count, description,
           has_cafe, has_parking, has_party_rooms, is_sen_friendly,
           has_baby_area, has_outdoor
    FROM venues
    WHERE status = 'active' AND enrichment_status != 'complete'
    ORDER BY COALESCE(google_review_count, 0) DESC, id ASC
    LIMIT ${batchSize}
  `

  if (venues.length === 0) {
    return NextResponse.json({
      done: true,
      processed: 0,
      errors: 0,
      results: [],
      message: 'All venues have been enriched.',
    })
  }

  const PER_VENUE_TIMEOUT = 60_000
  const results: Array<{ id: number; name: string; ok: boolean; error?: string }> = []

  // Process venues SEQUENTIALLY to respect Groq rate limits
  for (const venue of venues) {
    const vid = Number(venue.id)
    const venueName = venue.name as string
    const city = venue.city as string || 'the local area'
    const county = venue.county as string || ''
    const category = venue.category as string || 'soft_play'
    const categoryCtx = getCategoryContext(category)
    const googleRating = venue.google_rating ? Number(venue.google_rating) : null
    const googleReviewCount = venue.google_review_count ? Number(venue.google_review_count) : 0

    // Check how many reviews already exist
    const existingReviews = await sql`SELECT COUNT(*) as cnt FROM reviews WHERE venue_id = ${vid} AND source = 'first_party'`
    const existingReviewCount = Number(existingReviews[0]?.cnt) || 0
    const reviewsNeeded = Math.max(0, (9 + Math.floor(Math.random() * 3)) - existingReviewCount)

    // Check if hours exist
    const existingHours = await sql`SELECT COUNT(*) as cnt FROM venue_opening_hours WHERE venue_id = ${vid} AND NOT is_closed`
    const hasHours = Number(existingHours[0]?.cnt) > 0

    try {
      // ── SINGLE COMBINED AI CALL ──
      const prompt = buildCombinedPrompt({
        venueName,
        category,
        categoryCtx,
        city,
        county,
        googleRating,
        googleReviewCount,
        reviewsNeeded,
        hasHours,
      })

      const aiResult = await withTimeout(
        generateText({
          model: groq('llama-3.3-70b-versatile'),
          prompt,
        }),
        PER_VENUE_TIMEOUT,
        venueName,
      )

      const parsed = parseJsonFromText(aiResult.text) as EnrichmentResult | null

      if (!parsed) {
        results.push({ id: vid, name: venueName, ok: false, error: 'Failed to parse AI response' })
        await sql`UPDATE venues SET enrichment_status = 'error' WHERE id = ${vid}`
        continue
      }

      // ── WRITE DESCRIPTION ──
      if (parsed.description && parsed.description.length > 20) {
        await sql`UPDATE venues SET description = ${parsed.description} WHERE id = ${vid}`
      }

      // ── WRITE FACILITIES ──
      if (parsed.facilities && typeof parsed.facilities.has_cafe === 'boolean') {
        await sql`UPDATE venues SET
          has_cafe = ${parsed.facilities.has_cafe},
          has_parking = ${parsed.facilities.has_parking ?? false},
          has_party_rooms = ${parsed.facilities.has_party_rooms ?? false},
          has_baby_area = ${parsed.facilities.has_baby_area ?? false},
          has_outdoor = ${parsed.facilities.has_outdoor ?? false},
          is_sen_friendly = ${parsed.facilities.is_sen_friendly ?? false}
        WHERE id = ${vid}`
      }

      // ── WRITE OPENING HOURS ──
      if (parsed.hours && Array.isArray(parsed.hours) && parsed.hours.length > 0 && !hasHours) {
        for (const h of parsed.hours) {
          const dayNum = Number(h.day)
          if (dayNum < 0 || dayNum > 6) continue
          await sql`
            INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
            VALUES (${vid}, ${dayNum}, ${h.closed ? null : h.open}, ${h.closed ? null : h.close}, ${h.closed ?? false})
            ON CONFLICT (venue_id, day_of_week)
            DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, is_closed = EXCLUDED.is_closed
          `
        }
      }

      // ── WRITE REVIEWS ──
      if (parsed.reviews && Array.isArray(parsed.reviews) && parsed.reviews.length > 0) {
        let insertedCount = 0
        for (const review of parsed.reviews.slice(0, reviewsNeeded)) {
          if (!review.comment || review.comment.length < 10) continue
          const author = randomAuthor()
          const daysAgo = Math.floor(Math.random() * 180) + 7
          const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
          const rating = Math.min(5, Math.max(1, Math.round(review.rating)))
          const cleanliness = Math.min(5, Math.max(1, Math.round(review.cleanliness ?? review.rating)))
          const value = Math.min(5, Math.max(1, Math.round(review.value ?? review.rating)))
          const fun = Math.min(5, Math.max(1, Math.round(review.fun ?? review.rating)))

          await sql`
            INSERT INTO reviews (venue_id, source, author_name, rating, cleanliness_rating, value_rating, fun_rating, body, created_at)
            VALUES (${vid}, 'first_party', ${author}, ${rating}, ${cleanliness}, ${value}, ${fun}, ${review.comment}, ${createdAt})
          `
          insertedCount++
        }

        // Update aggregated rating on venue
        if (insertedCount > 0) {
          const agg = await sql`
            SELECT AVG(rating) as avg_rating, COUNT(*) as cnt,
                   AVG(cleanliness_rating) as avg_clean
            FROM reviews WHERE venue_id = ${vid} AND source = 'first_party'
          `
          if (agg.length > 0) {
            await sql`UPDATE venues SET
              first_party_rating = ${Number(agg[0].avg_rating)},
              first_party_review_count = ${Number(agg[0].cnt)},
              cleanliness_score = ${Number(agg[0].avg_clean)}
            WHERE id = ${vid}`
          }
        }
      }

      // ── MARK ENRICHED ──
      await sql`UPDATE venues SET enrichment_status = 'complete', updated_at = NOW() WHERE id = ${vid}`
      results.push({ id: vid, name: venueName, ok: true })

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      results.push({ id: vid, name: venueName, ok: false, error: errMsg })
      await sql`UPDATE venues SET enrichment_status = 'error' WHERE id = ${vid}`
    }
  }

  const processed = results.filter(r => r.ok).length
  const errors = results.filter(r => !r.ok).length

  return NextResponse.json({
    done: venues.length < batchSize,
    processed,
    errors,
    results,
    message: `Processed ${processed} venues, ${errors} errors`,
  })
}

// ── Prompt Builder ───────────────────────────────────────────

function buildCombinedPrompt(opts: {
  venueName: string
  category: string
  categoryCtx: string
  city: string
  county: string
  googleRating: number | null
  googleReviewCount: number
  reviewsNeeded: number
  hasHours: boolean
}): string {
  const {
    venueName, categoryCtx, city, county,
    googleRating, googleReviewCount, reviewsNeeded, hasHours,
  } = opts

  const ratingCtx = googleRating
    ? `It has a ${googleRating}/5 Google rating from ${googleReviewCount} reviews.`
    : ''

  return `You are generating content for a UK children's venue directory.

VENUE: "${venueName}"
TYPE: ${categoryCtx}
LOCATION: ${city}${county ? `, ${county}` : ''}, UK
${ratingCtx}

Generate ALL of the following in a SINGLE JSON response:

1. DESCRIPTION: A warm, factual 2-3 sentence description for parents. Do not start with "Welcome to". Do not put quotes around the venue name.

2. FACILITIES: Realistic boolean flags based on the venue type. Soft play centres typically have cafe, parking, party rooms, baby area. Public playgrounds are usually free with no cafe. Trampoline parks have parking but may not have baby areas. Be realistic.

3. OPENING HOURS: Typical opening hours for this type of venue in the UK. Day 0 = Sunday, 1 = Monday ... 6 = Saturday. Most soft play/trampoline parks open 9:30-18:00 weekdays and 10:00-17:00 weekends. Playgrounds are open dawn to dusk. Use 24h format (e.g. "09:30", "18:00").${hasHours ? ' NOTE: This venue already has hours -- return an empty array for hours.' : ''}

4. REVIEWS: Write exactly ${reviewsNeeded} realistic parent reviews in British English. Mix of 4-5 star (mostly) with 1-2 moderate 3-4 star reviews. Each review should be 1-3 sentences using natural British phrases ("brilliant", "lovely", "the kids absolutely loved it", "fab", "well worth a visit"). Do NOT mention reviewer names. Include specific details about the experience.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "description": "...",
  "facilities": {
    "has_cafe": true,
    "has_parking": true,
    "has_party_rooms": true,
    "has_baby_area": true,
    "has_outdoor": false,
    "is_sen_friendly": false
  },
  "hours": [
    {"day": 0, "open": "10:00", "close": "17:00", "closed": false},
    {"day": 1, "open": "09:30", "close": "18:00", "closed": false},
    {"day": 2, "open": "09:30", "close": "18:00", "closed": false},
    {"day": 3, "open": "09:30", "close": "18:00", "closed": false},
    {"day": 4, "open": "09:30", "close": "18:00", "closed": false},
    {"day": 5, "open": "09:30", "close": "18:00", "closed": false},
    {"day": 6, "open": "10:00", "close": "17:00", "closed": false}
  ],
  "reviews": [
    {"rating": 5, "comment": "...", "cleanliness": 4, "value": 5, "fun": 5},
    {"rating": 4, "comment": "...", "cleanliness": 4, "value": 4, "fun": 4}
  ]
}`
}
