import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// GET: List blog posts and stats
export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

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
}

// POST: Generate blog posts
export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }

  const action = (body.action as string) || 'generate_city'
  const city = body.city as string | undefined
  const region = body.region as string | undefined
  const postId = body.postId ? Number(body.postId) : null
  const autoPublish = body.autoPublish === true

  // Action: publish a draft post
  if (action === 'publish' && postId) {
    await sql`UPDATE blog_posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = ${postId}`
    return NextResponse.json({ success: true, message: 'Post published' })
  }

  // Action: unpublish
  if (action === 'unpublish' && postId) {
    await sql`UPDATE blog_posts SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = ${postId}`
    return NextResponse.json({ success: true, message: 'Post unpublished' })
  }

  // Action: bulk generate for all cities with 3+ venues
  if (action === 'bulk_generate') {
    const cities = await sql`
      SELECT city, county, COUNT(*) as cnt
      FROM venues WHERE status = 'active' AND city IS NOT NULL AND city != ''
      GROUP BY city, county HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC LIMIT 50
    `

    let generated = 0
    let skipped = 0
    for (const c of cities) {
      const citySlug = `best-soft-play-in-${slugify(c.city as string)}`
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${citySlug}`
      if (existing.length > 0) { skipped++; continue }

      try {
        await generateCityPost(c.city as string, c.county as string, Number(c.cnt), autoPublish)
        generated++
      } catch (err) {
        console.error(`[v0] Error generating blog for ${c.city}:`, err instanceof Error ? err.message : err)
      }
    }
    return NextResponse.json({ success: true, generated, skipped, message: `Generated ${generated} posts, skipped ${skipped} existing` })
  }

  // Action: generate for specific city
  if (action === 'generate_city' && city) {
    const [venueStats] = await sql`
      SELECT COUNT(*) as cnt, MAX(county) as county
      FROM venues WHERE status = 'active' AND LOWER(city) = LOWER(${city})
    `
    const slug = `best-soft-play-in-${slugify(city)}`
    const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: `Blog post for ${city} already exists` })
    }

    await generateCityPost(city, venueStats.county as string || '', Number(venueStats.cnt), autoPublish)
    return NextResponse.json({ success: true, message: `Blog post generated for ${city}` })
  }

  // Action: generate for specific region
  if (action === 'generate_region' && region) {
    const [venueStats] = await sql`
      SELECT COUNT(*) as cnt
      FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region})
    `
    const slug = `soft-play-centres-in-${slugify(region)}`
    const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: `Blog post for ${region} already exists` })
    }

    await generateRegionPost(region, Number(venueStats.cnt), autoPublish)
    return NextResponse.json({ success: true, message: `Blog post generated for ${region}` })
  }

  return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
}

async function generateCityPost(city: string, county: string, venueCount: number, autoPublish: boolean) {
  // Get top venues in this city for internal linking
  const topVenues = await sql`
    SELECT name, slug, google_rating, category, description
    FROM venues WHERE status = 'active' AND LOWER(city) = LOWER(${city})
    ORDER BY google_rating DESC NULLS LAST LIMIT 8
  `

  const venueList = topVenues.map((v, i) =>
    `${i + 1}. ${v.name} (${v.category || 'play venue'}${v.google_rating ? `, rated ${v.google_rating}/5` : ''})`
  ).join('\n')

  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt: `Write a comprehensive, SEO-optimised blog article titled "Best Soft Play Centres in ${city}" for a UK parenting website called Softplay UK.

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

Also provide:
- A meta title (max 60 chars) optimised for "soft play ${city}"
- A meta description (max 155 chars) for search results
- A short excerpt (max 200 chars) for blog listing pages`,
    output: Output.object({
      schema: z.object({
        title: z.string(),
        content: z.string(),
        meta_title: z.string(),
        meta_description: z.string(),
        excerpt: z.string(),
      }),
    }),
  })

  const post = result.object
  if (!post) throw new Error('AI returned no content')

  const wordCount = post.content.split(/\s+/).length
  const slug = `best-soft-play-in-${slugify(city)}`
  const status = autoPublish ? 'published' : 'draft'

  await sql`
    INSERT INTO blog_posts (slug, title, content, excerpt, category, region, city, meta_title, meta_description, word_count, status, published_at)
    VALUES (${slug}, ${post.title}, ${post.content}, ${post.excerpt}, ${'city-guide'}, ${county}, ${city}, ${post.meta_title}, ${post.meta_description}, ${wordCount}, ${status}, ${autoPublish ? new Date().toISOString() : null})
  `
}

async function generateRegionPost(region: string, venueCount: number, autoPublish: boolean) {
  const topCities = await sql`
    SELECT city, COUNT(*) as cnt
    FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region}) AND city IS NOT NULL AND city != ''
    GROUP BY city ORDER BY cnt DESC LIMIT 8
  `

  const cityList = topCities.map((c, i) =>
    `${i + 1}. ${c.city} (${c.cnt} venues)`
  ).join('\n')

  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt: `Write a comprehensive, SEO-optimised blog article titled "Soft Play Centres in ${region}: A Complete Guide for Parents" for a UK parenting website called Softplay UK.

Requirements:
- MINIMUM 550 words (aim for 600-700 words)
- Write in British English
- Include an engaging introduction about family-friendly activities in ${region}
- Create H2 sections for: overview of the region's play scene, top cities to explore, what to expect, and planning tips
- Mention that ${venueCount} venues are listed across ${region}
- Reference these cities and their venue counts:
${cityList}
- Include practical advice for parents exploring ${region}'s play options
- End with a call to action to browse all venues in ${region}
- Tone: warm, helpful, authoritative
- Do NOT include the title in the body content
- Use markdown formatting with ## for headings

Also provide:
- A meta title (max 60 chars) optimised for "soft play ${region}"
- A meta description (max 155 chars)
- A short excerpt (max 200 chars)`,
    output: Output.object({
      schema: z.object({
        title: z.string(),
        content: z.string(),
        meta_title: z.string(),
        meta_description: z.string(),
        excerpt: z.string(),
      }),
    }),
  })

  const post = result.object
  if (!post) throw new Error('AI returned no content')

  const wordCount = post.content.split(/\s+/).length
  const slug = `soft-play-centres-in-${slugify(region)}`
  const status = autoPublish ? 'published' : 'draft'

  await sql`
    INSERT INTO blog_posts (slug, title, content, excerpt, category, region, city, meta_title, meta_description, word_count, status, published_at)
    VALUES (${slug}, ${post.title}, ${post.content}, ${post.excerpt}, ${'region-guide'}, ${region}, ${null}, ${post.meta_title}, ${post.meta_description}, ${wordCount}, ${status}, ${autoPublish ? new Date().toISOString() : null})
  `
}
