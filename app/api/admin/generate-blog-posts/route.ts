import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'
import {
  buildCityGuidePrompt,
  buildCityGuideExpansionPrompt,
  buildAreaGuidePrompt,
  buildIntentPagePrompt,
  INTENT_TYPES,
  SOFT_PLAY_CATEGORIES,
  type IntentType,
  type VenueData,
} from '@/lib/blog-prompts'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

// Minimum word counts by content type
const MIN_WORDS = { city: 1100, area: 500, intent: 600, region: 500 } as const

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  // 1. Direct parse
  try { return JSON.parse(text) } catch { /* continue */ }

  // 2. Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch { /* continue */ }
  }

  // 3. Extract outermost braces
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    const jsonCandidate = text.slice(braceStart, braceEnd + 1)
    try { return JSON.parse(jsonCandidate) } catch { /* continue */ }

    // 4. Fix common LLM JSON issues: unescaped newlines inside string values
    try {
      const fixed = jsonCandidate
        .replace(/:\s*"([\s\S]*?)"\s*([,}])/g, (_match, value, end) => {
          const escaped = value
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/(?<!\\)"/g, '\\"')
          return `: "${escaped}"${end}`
        })
      return JSON.parse(fixed)
    } catch { /* continue */ }

    // 5. Last resort: extract key fields manually with regex
    try {
      const extract = (key: string): string => {
        const re = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*[,}]`)
        const m = jsonCandidate.match(re)
        return m ? m[1].replace(/\n/g, '\\n').replace(/(?<!\\)"/g, '\\"') : ''
      }
      const title = extract('title')
      const content = extract('content')
      const excerpt = extract('excerpt')
      const meta_title = extract('meta_title')
      const meta_description = extract('meta_description')

      if (content) {
        // Try to extract faqs array
        let faqs: Array<{ question: string; answer: string }> = []
        const faqMatch = jsonCandidate.match(/"faqs"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)
        if (faqMatch) {
          try { faqs = JSON.parse(faqMatch[1]) } catch { /* skip faqs */ }
        }

        return { title, content, excerpt, meta_title, meta_description, faqs }
      }
    } catch { /* continue */ }
  }

  return null
}

// ─── Venue filtering: only paid indoor venues, exclude playgrounds/parks ───
const CATEGORY_FILTER = SOFT_PLAY_CATEGORIES.map(c => `'${c}'`).join(', ')

async function fetchVenuesForCity(city: string, limit = 10): Promise<VenueData[]> {
  const rows = await sql`
    SELECT name, slug, category, google_rating, description, city, county,
           has_party_rooms, is_sen_friendly, has_baby_area, has_cafe, has_parking,
           has_outdoor, price_range, age_range
    FROM venues
    WHERE status = 'active' AND LOWER(city) = LOWER(${city})
      AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
    ORDER BY google_rating DESC NULLS LAST
    LIMIT ${limit}
  `
  return rows as unknown as VenueData[]
}

async function fetchVenuesForArea(city: string, area: string, limit = 8): Promise<VenueData[]> {
  const rows = await sql`
    SELECT name, slug, category, google_rating, description, city, county,
           has_party_rooms, is_sen_friendly, has_baby_area, has_cafe, has_parking,
           has_outdoor, price_range, age_range
    FROM venues
    WHERE status = 'active' AND LOWER(city) = LOWER(${city})
      AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
    ORDER BY google_rating DESC NULLS LAST
    LIMIT ${limit}
  `
  return rows as unknown as VenueData[]
}

async function fetchVenuesForIntent(city: string, intent: IntentType, limit = 8): Promise<VenueData[]> {
  let orderClause = 'google_rating DESC NULLS LAST'
  switch (intent) {
    case 'birthday-parties': orderClause = 'has_party_rooms DESC, google_rating DESC NULLS LAST'; break
    case 'toddler-soft-play': orderClause = 'has_baby_area DESC, google_rating DESC NULLS LAST'; break
    case 'sen-friendly': orderClause = 'is_sen_friendly DESC, google_rating DESC NULLS LAST'; break
    default: break
  }
  // Must use raw SQL for dynamic ORDER BY
  const rows = await sql`
    SELECT name, slug, category, google_rating, description, city, county,
           has_party_rooms, is_sen_friendly, has_baby_area, has_cafe, has_parking,
           has_outdoor, price_range, age_range
    FROM venues
    WHERE status = 'active' AND LOWER(city) = LOWER(${city})
      AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
    ORDER BY ${intent === 'birthday-parties' ? sql`has_party_rooms DESC, google_rating DESC NULLS LAST`
      : intent === 'toddler-soft-play' ? sql`has_baby_area DESC, google_rating DESC NULLS LAST`
      : intent === 'sen-friendly' ? sql`is_sen_friendly DESC, google_rating DESC NULLS LAST`
      : sql`google_rating DESC NULLS LAST`}
    LIMIT ${limit}
  `
  return rows as unknown as VenueData[]
}

async function getNearbyCities(city: string, limit = 3): Promise<string[]> {
  const rows = await sql`
    SELECT city, COUNT(*) as cnt
    FROM venues
    WHERE status = 'active' AND LOWER(city) != LOWER(${city}) AND city IS NOT NULL AND city != ''
      AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
    GROUP BY city
    ORDER BY cnt DESC
    LIMIT ${limit}
  `
  return rows.map(r => r.city as string)
}

async function getAreasForCity(city: string): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT county
    FROM venues
    WHERE status = 'active' AND LOWER(city) = LOWER(${city}) AND county IS NOT NULL AND county != ''
      AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
  `
  return rows.map(r => r.county as string)
}

function buildSlug(contentType: string, city: string, area?: string, intent?: string): string {
  const citySlug = slugify(city)
  switch (contentType) {
    case 'city': return `guides-${citySlug}`
    case 'area': return `guides-${citySlug}-${slugify(area || '')}`
    case 'intent': return `guides-${citySlug}-${intent || ''}`
    default: return `guides-${citySlug}`
  }
}

function buildCanonicalUrl(contentType: string, city: string, area?: string, intent?: string): string {
  const citySlug = slugify(city)
  switch (contentType) {
    case 'city': return `/guides/${citySlug}`
    case 'area': return `/guides/${citySlug}/${slugify(area || '')}`
    case 'intent': return `/guides/${citySlug}/${intent || ''}`
    default: return `/guides/${citySlug}`
  }
}

// ─── Core generation + auto-regeneration on low word count ───
async function generateAndSavePost(
  contentType: string,
  prompt: string,
  city: string,
  county: string,
  autoPublish: boolean,
  area?: string,
  intent?: string,
) {
  const minWords = MIN_WORDS[contentType as keyof typeof MIN_WORDS] || 800

  // First generation attempt
  let result = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    prompt,
  })

  let post = parseJsonFromText(result.text)
  if (!post || !post.content) {
    console.error(`[v0] Unparseable AI response for ${city}. First 500 chars:`, result.text?.substring(0, 500))
    throw new Error(`AI returned unparseable content. Raw text length: ${result.text?.length || 0}. Preview: ${result.text?.substring(0, 150)}`)
  }

  let content = post.content as string
  let wordCount = content.split(/\s+/).length

  // Auto-regeneration: if under minimum, expand with a second pass
  if (wordCount < minWords) {
    const label = contentType === 'city' ? city : area || intent || city
    console.log(`[v0] ${contentType} guide for ${label} only ${wordCount} words (min ${minWords}), auto-expanding...`)
    const expansionPrompt = contentType === 'city'
      ? buildCityGuideExpansionPrompt(city, content, wordCount)
      : `You previously wrote the following ${contentType} guide about "${label}" but it was only ${wordCount} words. ` +
        `Please rewrite it to be at least ${minWords} words. Add more detail, expand each section, include more specific tips and recommendations. ` +
        `Return ONLY valid JSON with keys: title, content (markdown string), excerpt, meta_title, meta_description, faqs (array of {question, answer}).` +
        `\n\nOriginal content:\n${content}`
    await delay(2000)

    result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: expansionPrompt,
    })

    const expandedPost = parseJsonFromText(result.text)
    if (expandedPost?.content) {
      const expandedContent = expandedPost.content as string
      const expandedWordCount = expandedContent.split(/\s+/).length
      if (expandedWordCount > wordCount) {
        post = expandedPost
        content = expandedContent
        wordCount = expandedWordCount
        console.log(`[v0] Expanded to ${wordCount} words`)
      }
    }
  }

  // Final validation -- accept content above 50% of minimum (small towns may have fewer venues)
  if (wordCount < Math.floor(minWords * 0.5)) {
    throw new Error(`Content too short: ${wordCount} words (minimum ~${Math.floor(minWords * 0.5)})`)
  }

  const faqs = (post.faqs as Array<{ question: string; answer: string }>) || []
  const slug = buildSlug(contentType, city, area, intent)
  const canonicalUrl = buildCanonicalUrl(contentType, city, area, intent)
  const status = autoPublish ? 'published' : 'draft'
  const category = contentType === 'city' ? 'city-guide' : contentType === 'area' ? 'area-guide' : 'intent-guide'

  await sql`
    INSERT INTO blog_posts (
      slug, title, content, excerpt, category, content_type, region, city, area, intent,
      meta_title, meta_description, og_title, og_description, canonical_url,
      faq_json, word_count, status, published_at
    ) VALUES (
      ${slug},
      ${(post.title as string) || ''},
      ${content},
      ${(post.excerpt as string) || ''},
      ${category},
      ${contentType},
      ${county},
      ${city},
      ${area || null},
      ${intent || null},
      ${(post.meta_title as string) || (post.title as string) || ''},
      ${(post.meta_description as string) || ''},
      ${(post.og_title as string) || (post.meta_title as string) || ''},
      ${(post.og_description as string) || (post.meta_description as string) || ''},
      ${canonicalUrl},
      ${JSON.stringify(faqs)},
      ${wordCount},
      ${status},
      ${autoPublish ? new Date().toISOString() : null}
    )
  `

  return { title: post.title as string, wordCount, slug }
}

// ─── GET: List blog posts and stats ─────────────────────────
export async function GET(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'
    const contentType = url.searchParams.get('contentType')

    let posts
    if (contentType && contentType !== 'all') {
      posts = status === 'all'
        ? await sql`SELECT id, slug, title, excerpt, category, content_type, region, city, area, intent, word_count, status, published_at, created_at FROM blog_posts WHERE content_type = ${contentType} ORDER BY created_at DESC LIMIT 200`
        : await sql`SELECT id, slug, title, excerpt, category, content_type, region, city, area, intent, word_count, status, published_at, created_at FROM blog_posts WHERE status = ${status} AND content_type = ${contentType} ORDER BY created_at DESC LIMIT 200`
    } else {
      posts = status === 'all'
        ? await sql`SELECT id, slug, title, excerpt, category, content_type, region, city, area, intent, word_count, status, published_at, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 200`
        : await sql`SELECT id, slug, title, excerpt, category, content_type, region, city, area, intent, word_count, status, published_at, created_at FROM blog_posts WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`
    }

    const [stats] = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN content_type = 'city' THEN 1 END) as city_guides,
        COUNT(CASE WHEN content_type = 'area' THEN 1 END) as area_guides,
        COUNT(CASE WHEN content_type = 'intent' THEN 1 END) as intent_pages
      FROM blog_posts
    `

    return NextResponse.json({
      posts,
      stats: {
        total: Number(stats.total),
        published: Number(stats.published),
        drafts: Number(stats.drafts),
        cityGuides: Number(stats.city_guides),
        areaGuides: Number(stats.area_guides),
        intentPages: Number(stats.intent_pages),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch blog posts', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// ─── POST: Generate / manage blog posts ─────────────────────
export async function POST(request: Request) {
  const authError = requireAdmin(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try { body = await request.json() } catch { body = {} }

  const action = (body.action as string) || 'generate_city'
  const city = body.city as string | undefined
  const region = body.region as string | undefined
  const area = body.area as string | undefined
  const intent = body.intent as string | undefined
  const postId = body.postId ? Number(body.postId) : null
  const autoPublish = body.autoPublish === true

  try {
    // ─── Publish / Unpublish / Delete ──────────
    if (action === 'publish' && postId) {
      await sql`UPDATE blog_posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post published' })
    }
    if (action === 'unpublish' && postId) {
      await sql`UPDATE blog_posts SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post unpublished' })
    }
    if (action === 'delete' && postId) {
      await sql`DELETE FROM blog_posts WHERE id = ${postId}`
      return NextResponse.json({ success: true, message: 'Post deleted' })
    }

    // ─── Generate City Guide ────────────────────
    if (action === 'generate_city' && city) {
      // Count only paid venues (exclude playgrounds)
      const [venueStats] = await sql`
        SELECT COUNT(*) as cnt, MAX(county) as county
        FROM venues WHERE status = 'active' AND LOWER(city) = LOWER(${city})
          AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
      `
      if (Number(venueStats.cnt) === 0) {
        return NextResponse.json({ success: false, message: `No paid soft play venues found in "${city}". Only public playgrounds may exist there.` })
      }

      const slug = buildSlug('city', city)
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `City guide for ${city} already exists` })
      }

      const venues = await fetchVenuesForCity(city, 10)
      const nearbyCities = await getNearbyCities(city, 3)
      const areas = await getAreasForCity(city)
      const county = (venueStats.county as string) || ''

      const prompt = buildCityGuidePrompt(city, county, Number(venueStats.cnt), venues, areas, nearbyCities)
      const result = await generateAndSavePost('city', prompt, city, county, autoPublish)

      return NextResponse.json({
        success: true,
        message: `City guide generated for ${city}: "${result.title}" (${result.wordCount} words)`,
      })
    }

    // ─── Generate Area Guide ────────────────────
    if (action === 'generate_area' && city && area) {
      const slug = buildSlug('area', city, area)
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `Area guide for ${area}, ${city} already exists` })
      }

      const venues = await fetchVenuesForArea(city, area, 8)
      if (venues.length === 0) {
        return NextResponse.json({ success: false, message: `No paid soft play venues found for ${area}, ${city}` })
      }

      const nearbyCities = await getNearbyCities(city, 3)
      const county = venues[0]?.county || ''

      const prompt = buildAreaGuidePrompt(area, city, venues, nearbyCities)
      const result = await generateAndSavePost('area', prompt, city, county, autoPublish, area)

      return NextResponse.json({
        success: true,
        message: `Area guide generated for ${area}, ${city}: "${result.title}" (${result.wordCount} words)`,
      })
    }

    // ─── Generate Intent Page ───────────────────
    if (action === 'generate_intent' && city && intent) {
      if (!(intent in INTENT_TYPES)) {
        return NextResponse.json({ success: false, message: `Invalid intent type: "${intent}". Valid: ${Object.keys(INTENT_TYPES).join(', ')}` })
      }

      const slug = buildSlug('intent', city, undefined, intent)
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `Intent page for "${intent}" in ${city} already exists` })
      }

      const venues = await fetchVenuesForIntent(city, intent as IntentType, 8)
      if (venues.length === 0) {
        return NextResponse.json({ success: false, message: `No paid soft play venues found in ${city}` })
      }

      const nearbyCities = await getNearbyCities(city, 3)
      const county = venues[0]?.county || ''

      const prompt = buildIntentPagePrompt(intent as IntentType, city, venues, nearbyCities)
      const result = await generateAndSavePost('intent', prompt, city, county, autoPublish, undefined, intent)

      return NextResponse.json({
        success: true,
        message: `Intent page generated: "${result.title}" (${result.wordCount} words)`,
      })
    }

    // ─── Generate Region Guide ──────────────────
    if (action === 'generate_region' && region) {
      const [venueStats] = await sql`
        SELECT COUNT(*) as cnt
        FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region})
          AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
      `
      if (Number(venueStats.cnt) === 0) {
        return NextResponse.json({ success: false, message: `No paid soft play venues found in "${region}".` })
      }

      const slug = `soft-play-centres-in-${slugify(region)}`
      const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: `Region guide for ${region} already exists` })
      }

      const topCities = await sql`
        SELECT city, COUNT(*) as cnt
        FROM venues WHERE status = 'active' AND LOWER(county) = LOWER(${region})
          AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
          AND city IS NOT NULL AND city != ''
        GROUP BY city ORDER BY cnt DESC LIMIT 8
      `
      const cityList = topCities.map((c, i) => `${i + 1}. ${c.city} (${c.cnt} venues)`).join('\n')

      const prompt = `Write a comprehensive, SEO-optimised region guide titled "Soft Play Centres in ${region}" for Softplay UK.

TARGET WORD COUNT: 1,200--1,800 words. Write in British English.
IMPORTANT: This guide covers PAID indoor soft play centres only, NOT public parks or playgrounds.

STRUCTURE:
## Introduction: Family activities in ${region}, ${Number(venueStats.cnt)} paid indoor soft play venues across the region
## Top Areas to Visit: Reference these cities:\n${cityList}
## What to Expect: Regional overview of indoor play options
## Prices & Booking Tips: General pricing guidance (do not fabricate specific prices)
## FAQs: 5--7 questions about soft play in ${region} with 40--70 word answers
## Closing: CTA to explore the region, link to city guides

QUALITY: Warm, helpful parent tone. No fluff, no fake stats. UK English only.
Do NOT include public parks, playgrounds, or free outdoor play areas in the main venue lists.

Respond with ONLY valid JSON: {"title":"...","content":"... markdown ...","meta_title":"... (max 60 chars, include 2026)","meta_description":"... (155-160 chars, mention indoor soft play centres)","og_title":"...","og_description":"...","excerpt":"...","faqs":[{"question":"...","answer":"..."}]}`

      const result = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })
      const post = parseJsonFromText(result.text)
      if (!post || !post.content) throw new Error('AI returned unparseable content')

      const content = post.content as string
      const wordCount = content.split(/\s+/).length
      const faqs = (post.faqs as Array<{ question: string; answer: string }>) || []
      const status = autoPublish ? 'published' : 'draft'

      await sql`
        INSERT INTO blog_posts (
          slug, title, content, excerpt, category, content_type, region, city,
          meta_title, meta_description, og_title, og_description, canonical_url,
          faq_json, word_count, status, published_at
        ) VALUES (
          ${slug}, ${(post.title as string) || ''}, ${content}, ${(post.excerpt as string) || ''},
          ${'region-guide'}, ${'region'}, ${region}, ${null},
          ${(post.meta_title as string) || ''}, ${(post.meta_description as string) || ''},
          ${(post.og_title as string) || ''}, ${(post.og_description as string) || ''},
          ${`/blog/post/${slug}`},
          ${JSON.stringify(faqs)}, ${wordCount}, ${status},
          ${autoPublish ? new Date().toISOString() : null}
        )
      `

      return NextResponse.json({
        success: true,
        message: `Region guide generated for ${region}: ${wordCount} words`,
      })
    }

    // ─── Bulk Generate City Guides ──────────────
    if (action === 'bulk_generate') {
      // Only count paid venues (exclude playgrounds)
      const cities = await sql`
        SELECT city, county, COUNT(*) as cnt
        FROM venues WHERE status = 'active' AND city IS NOT NULL AND city != ''
          AND category IN ('soft_play', 'adventure', 'trampoline_park', 'farm')
        GROUP BY city, county HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC LIMIT 50
      `

      if (cities.length === 0) {
        return NextResponse.json({ success: false, message: 'No cities with 3+ paid soft play venues found', generated: 0, skipped: 0, errors: [] })
      }

      let generated = 0
      let skipped = 0
      const errors: string[] = []

      for (const c of cities) {
        const cityName = c.city as string
        const slug = buildSlug('city', cityName)
        const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
        if (existing.length > 0) { skipped++; continue }

        try {
          const venues = await fetchVenuesForCity(cityName, 10)
          const nearbyCities = await getNearbyCities(cityName, 3)
          const areas = await getAreasForCity(cityName)
          const county = (c.county as string) || ''

          const prompt = buildCityGuidePrompt(cityName, county, Number(c.cnt), venues, areas, nearbyCities)
          await generateAndSavePost('city', prompt, cityName, county, autoPublish)
          generated++
          if (generated < cities.length) await delay(2500)
        } catch (err) {
          errors.push(`${cityName}: ${err instanceof Error ? err.message : String(err)}`)
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

    // ─── Bulk Generate Intent Pages for a City ──
    if (action === 'bulk_generate_intent' && city) {
      const intents = Object.keys(INTENT_TYPES) as IntentType[]
      let generated = 0
      let skipped = 0
      const errors: string[] = []

      for (const intentKey of intents) {
        const slug = buildSlug('intent', city, undefined, intentKey)
        const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${slug}`
        if (existing.length > 0) { skipped++; continue }

        try {
          const venues = await fetchVenuesForIntent(city, intentKey, 8)
          if (venues.length === 0) { skipped++; continue }

          const nearbyCities = await getNearbyCities(city, 3)
          const county = venues[0]?.county || ''
          const prompt = buildIntentPagePrompt(intentKey, city, venues, nearbyCities)
          await generateAndSavePost('intent', prompt, city, county, autoPublish, undefined, intentKey)
          generated++
          if (generated < intents.length) await delay(2500)
        } catch (err) {
          errors.push(`${intentKey}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      return NextResponse.json({
        success: generated > 0,
        generated,
        skipped,
        errors,
        message: `Generated ${generated} intent pages for ${city}, skipped ${skipped}${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      })
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Error: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}
