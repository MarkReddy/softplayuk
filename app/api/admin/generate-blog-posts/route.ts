import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Parse JSON from AI response text -- handles markdown code blocks
function parseJsonFromText(text: string): Record<string, string> | null {
  // Try direct parse
  try { return JSON.parse(text) } catch { /* continue */ }
  // Try extracting from ```json ... ``` blocks
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) {
    try { return JSON.parse(match[1].trim()) } catch { /* continue */ }
  }
  // Try finding first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch { /* continue */ }
  }
  return null
}

// GET: List blog posts and stats
export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'

    let posts
    if (status === 'all') {
      posts = await sql`SELECT id, slug, title, excerpt, category, region, city, word_count, status, published_at, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 200`
    } else {
      posts = await sql`SELECT id, slug, title, excerpt, category, region, city, word_count, status, published_at, created_at FROM blog_posts WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`
    }

    const [stats] = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts
      FROM blog_posts
    `

    return NextResponse.json({ posts, stats: { total: Number(stats.total), published: Number(stats.published), drafts: Number(stats.drafts) } })
  } catch (err) {
    console.error('[v0] Blog GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch blog posts', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// POST: Generate blog posts
export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }

  const action = (body.action as string) || 'generate_city'
  console.log(`[v0] Blog POST received - action: ${action}, city: ${body.city || 'none'}, region: ${body.region || 'none'}`)
  const city = body.city as string | undefined
  const region = body.region as string | undefined
  const postId = body.postId ? Number(body.postId) : null
  const autoPublish = body.autoPublish === true

  try {
    // Publish a draft post
    if (action === 'publish' && postId) {
      await sql`UPDATE blog_posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post published' })
    }

    // Unpublish
    if (action === 'unpublish' && postId) {
      await sql`UPDATE blog_posts SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post unpublished' })
    }

    // Delete
    if (action === 'delete' && postId) {
      await sql`DELETE FROM blog_posts WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post deleted' })
    }

    // Bulk generate for all cities with 3+ venues
    if (action === 'bulk_generate') {
      const cities = await sql`
        SELECT city, county, COUNT(*) as cnt
        FROM venues WHERE status = 'active' AND city IS NOT NULL AND city != ''
        GROUP BY city, county HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC LIMIT 50
      `
      console.log(`[v0] Bulk generate: found ${cities.length} cities with 3+ venues`)

      if (cities.length === 0) {
        return NextResponse.json({ success: false, message: 'No cities found with 3+ active venues', generated: 0, skipped: 0, errors: [] })
      }

      let generated = 0
      let skipped = 0
      const errors: string[] = []

      for (const c of cities) {
        const cityName = c.city as string
        const citySlug = `best-soft-play-in-${slugify(cityName)}`
        const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${citySlug}`
        if (existing.length > 0) { skipped++; continue }

        try {
          await generateCityPost(cityName, c.county as string, Number(c.cnt), autoPublish)
          generated++
          console.log(`[v0] Bulk: generated post for ${cityName} (${generated} done)`)
          // Rate limiting - wait 2s between AI calls to avoid hitting limits
          if (generated < cities.length) await delay(2000)
        } catch (err) {
          const errMsg = `${cityName}: ${err instanceof Error ? err.message : String(err)}`
          console.error(`[v0] Blog gen error - ${errMsg}`)
          errors.push(errMsg)
        }
      }
      return NextResponse.json({
        success: generated > 0,
        generated,
        skipped,
        totalCities: cities.length,
        errors,
        message: `Generated ${generated} posts, skipped ${skipped} existing${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      })
    }

    // Generate for specific city
    if (action === 'generate_city' && city) {
      const [venueStats] = await sql`
        SELECT COUNT(*) as cnt, MAX(county) as county
        FROM venues WHERE status = 'active' AND LOWER(city) = LOWER(${city})
      `
      console.log(`[v0] City generate: ${city} has ${venueStats.cnt} venues`)
      if (Number(venueStats.cnt) === 0) {
        return NextResponse.json({ success: false, message: `No active venues found in "${city}". Check the city name matches your database.` })
      }

      const slug = `best-soft-play-in-${slugify(city)}`
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `Blog post for ${city} already exists` })
      }

      await generateCityPost(city, venueStats.county as string || '', Number(venueStats.cnt), autoPublish)
      return NextResponse.json({ success: true, message: `Blog post generated for ${city}` })
    }

    // Generate for specific region
    if (action === 'generate_region' && region) {
      const [venueStats] = await sql`
        SELECT COUNT(*) as cnt
        FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region})
      `
      console.log(`[v0] Region generate: ${region} has ${venueStats.cnt} venues`)
      if (Number(venueStats.cnt) === 0) {
        return NextResponse.json({ success: false, message: `No active venues found in "${region}". Check the region name matches your database.` })
      }

      const slug = `soft-play-centres-in-${slugify(region)}`
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `Blog post for ${region} already exists` })
      }

      await generateRegionPost(region, Number(venueStats.cnt), autoPublish)
      return NextResponse.json({ success: true, message: `Blog post generated for ${region}` })
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
  } catch (err) {
    console.error('[v0] Blog POST error:', err)
    return NextResponse.json({
      success: false,
      message: `Error: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}

async function generateCityPost(city: string, county: string, venueCount: number, autoPublish: boolean) {
  console.log(`[v0] generateCityPost starting for: ${city}`)
  
  const topVenues = await sql`
    SELECT name, slug, google_rating, category, description
    FROM venues WHERE status = 'active' AND LOWER(city) = LOWER(${city})
    ORDER BY google_rating DESC NULLS LAST LIMIT 8
  `
  console.log(`[v0] Found ${topVenues.length} top venues for ${city}`)

  const venueList = topVenues.map((v, i) =>
    `${i + 1}. ${v.name} (${v.category || 'play venue'}${v.google_rating ? `, rated ${v.google_rating}/5` : ''})`
  ).join('\n')

  const prompt = `Write a comprehensive, SEO-optimised blog article titled "Best Soft Play Centres in ${city}" for a UK parenting website called SoftPlay UK.

Requirements:
- MINIMUM 550 words (aim for 600-700 words)
- Write in British English (e.g. "centres" not "centers", "colour" not "color")
- Include an engaging introduction about why ${city} is great for families
- Create H2 sections for: overview of play options, top venues to visit, tips for parents, and a conclusion
- Naturally mention ${venueCount} venues are listed in ${city}${county ? ` in ${county}` : ''}
- Reference these specific venues by name (use their exact names): 
${venueList}
- Include practical tips for parents visiting soft play centres
- End with a call to action encouraging readers to browse all venues in ${city}
- Tone: warm, helpful, authoritative -- like a trusted local parent
- Do NOT include the title in the body content
- Use markdown formatting with ## for headings

You MUST respond with ONLY a valid JSON object (no markdown code blocks, no extra text) with these exact fields:
{
  "title": "the article title",
  "content": "the full article body in markdown",
  "meta_title": "SEO meta title (max 60 chars)",
  "meta_description": "meta description (max 155 chars)",
  "excerpt": "short excerpt (max 200 chars)"
}`

  console.log(`[v0] Calling generateText for ${city}...`)
  let result
  try {
    result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
    })
    console.log(`[v0] generateText completed for ${city}. Text length: ${result.text?.length || 0}`)
  } catch (aiError) {
    console.error(`[v0] generateText FAILED for ${city}:`, aiError)
    throw new Error(`AI generation failed for ${city}: ${aiError instanceof Error ? aiError.message : String(aiError)}`)
  }

  const post = parseJsonFromText(result.text)
  if (!post || !post.content) {
    console.error(`[v0] Failed to parse JSON for ${city}. Text preview: ${result.text?.substring(0, 300)}`)
    throw new Error(`AI returned unparseable content for ${city}. Raw text length: ${result.text?.length || 0}`)
  }

  const wordCount = post.content.split(/\s+/).length
  console.log(`[v0] Post for ${city}: "${post.title}" - ${wordCount} words`)
  if (wordCount < 100) {
    throw new Error(`AI content too short for ${city}: only ${wordCount} words`)
  }

  const slug = `best-soft-play-in-${slugify(city)}`
  const status = autoPublish ? 'published' : 'draft'

  try {
    await sql`
      INSERT INTO blog_posts (slug, title, content, excerpt, category, region, city, meta_title, meta_description, word_count, status, published_at)
      VALUES (${slug}, ${post.title}, ${post.content}, ${post.excerpt || ''}, ${'city-guide'}, ${county}, ${city}, ${post.meta_title || post.title}, ${post.meta_description || ''}, ${wordCount}, ${status}, ${autoPublish ? new Date().toISOString() : null})
    `
    console.log(`[v0] Inserted blog post for ${city} with slug: ${slug}`)
  } catch (dbError) {
    console.error(`[v0] DB insert FAILED for ${city}:`, dbError)
    throw new Error(`Database insert failed for ${city}: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
  }
}

async function generateRegionPost(region: string, venueCount: number, autoPublish: boolean) {
  console.log(`[v0] generateRegionPost starting for: ${region}`)

  const topCities = await sql`
    SELECT city, COUNT(*) as cnt
    FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region}) AND city IS NOT NULL AND city != ''
    GROUP BY city ORDER BY cnt DESC LIMIT 8
  `

  const cityList = topCities.map((c, i) =>
    `${i + 1}. ${c.city} (${c.cnt} venues)`
  ).join('\n')

  const prompt = `Write a comprehensive, SEO-optimised blog article titled "Soft Play Centres in ${region}" for a UK parenting website called SoftPlay UK.

Requirements:
- MINIMUM 550 words (aim for 600-700 words)
- Write in British English (e.g. "centres" not "centers")
- Include an engaging intro about family activities in ${region}
- Create H2 sections for: regional overview, top areas to visit, what to expect, and a conclusion
- Mention that SoftPlay UK lists ${venueCount} venues across ${region}
- Reference these cities/towns and their venue counts:
${cityList}
- Include practical tips for families
- End with a call to action encouraging readers to explore the region
- Tone: warm, helpful, authoritative
- Do NOT include the title in the body content
- Use markdown formatting with ## for headings

You MUST respond with ONLY a valid JSON object (no markdown code blocks, no extra text) with these exact fields:
{
  "title": "the article title",
  "content": "the full article body in markdown",
  "meta_title": "SEO meta title (max 60 chars)",
  "meta_description": "meta description (max 155 chars)",
  "excerpt": "short excerpt (max 200 chars)"
}`

  console.log(`[v0] Calling generateText for region ${region}...`)
  let result
  try {
    result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
    })
    console.log(`[v0] generateText completed for ${region}. Text length: ${result.text?.length || 0}`)
  } catch (aiError) {
    console.error(`[v0] generateText FAILED for ${region}:`, aiError)
    throw new Error(`AI generation failed for ${region}: ${aiError instanceof Error ? aiError.message : String(aiError)}`)
  }

  const post = parseJsonFromText(result.text)
  if (!post || !post.content) {
    console.error(`[v0] Failed to parse JSON for ${region}. Text preview: ${result.text?.substring(0, 300)}`)
    throw new Error(`AI returned unparseable content for ${region}. Raw text length: ${result.text?.length || 0}`)
  }

  const wordCount = post.content.split(/\s+/).length
  console.log(`[v0] Post for ${region}: "${post.title}" - ${wordCount} words`)
  if (wordCount < 100) {
    throw new Error(`AI content too short for ${region}: only ${wordCount} words`)
  }

  const slug = `soft-play-centres-in-${slugify(region)}`
  const status = autoPublish ? 'published' : 'draft'

  try {
    await sql`
      INSERT INTO blog_posts (slug, title, content, excerpt, category, region, city, meta_title, meta_description, word_count, status, published_at)
      VALUES (${slug}, ${post.title}, ${post.content}, ${post.excerpt || ''}, ${'region-guide'}, ${region}, ${null}, ${post.meta_title || post.title}, ${post.meta_description || ''}, ${wordCount}, ${status}, ${autoPublish ? new Date().toISOString() : null})
    `
    console.log(`[v0] Inserted blog post for ${region} with slug: ${slug}`)
  } catch (dbError) {
    console.error(`[v0] DB insert FAILED for ${region}:`, dbError)
    throw new Error(`Database insert failed for ${region}: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
  }
}
