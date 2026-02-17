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

// Target word counts (auto-expansion triggers below these)
// Hard rejection only below 250 words -- anything above is valid SEO content
const MIN_WORDS = { city: 800, area: 400, intent: 400, region: 400 } as const

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Extract a delimited field from AI output: <TAG>value</TAG> -- case insensitive */
function extractTag(text: string, tag: string): string {
  // Try exact case first, then case-insensitive
  for (const t of [tag, tag.toLowerCase(), tag.toUpperCase()]) {
    const openTag = `<${t}>`
    const closeTag = `</${t}>`
    const start = text.indexOf(openTag)
    const end = text.indexOf(closeTag, start + openTag.length)
    if (start !== -1 && end !== -1 && end > start) {
      return text.slice(start + openTag.length, end).trim()
    }
  }
  // Regex fallback for any casing
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  const m = text.match(re)
  return m ? m[1].trim() : ''
}

/** Parse FAQ block: "Q: ...\nA: ..." pairs */
function parseFaqs(faqText: string): Array<{ question: string; answer: string }> {
  if (!faqText) return []
  const faqs: Array<{ question: string; answer: string }> = []
  // Split on Q: patterns (with optional numbering)
  const pairs = faqText.split(/\n\s*(?:\d+\.\s*)?Q:\s*/i).filter(s => s.trim())
  for (const pair of pairs) {
    const cleaned = pair.replace(/^Q:\s*/i, '').trim()
    const aIndex = cleaned.search(/\nA:\s*/i)
    if (aIndex === -1) continue
    const question = cleaned.slice(0, aIndex).trim().replace(/^\d+\.\s*/, '').replace(/\?$/, '') + '?'
    const answer = cleaned.slice(aIndex).replace(/^\nA:\s*/i, '').trim()
    if (question.length > 5 && answer.length > 5) faqs.push({ question, answer })
  }
  return faqs
}

/** Fix literal newlines inside JSON strings using char-by-char scan */
function fixJsonNewlines(jsonStr: string): string {
  let fixed = ''
  let inStr = false
  let esc = false
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i]
    if (esc) { fixed += ch; esc = false; continue }
    if (ch === '\\') { fixed += ch; esc = true; continue }
    if (ch === '"') { inStr = !inStr; fixed += ch; continue }
    if (inStr && ch === '\n') { fixed += '\\n'; continue }
    if (inStr && ch === '\r') { continue }
    if (inStr && ch === '\t') { fixed += '\\t'; continue }
    fixed += ch
  }
  return fixed
}

/** Parse AI response -- supports delimited format (primary) and JSON (fallback) */
function parseAIResponse(text: string): Record<string, unknown> | null {
  console.log('[v0] parseAIResponse called, text length:', text?.length, 'first 200 chars:', text?.substring(0, 200))

  // PRIMARY: Delimited tag format <CONTENT>...</CONTENT>
  const content = extractTag(text, 'CONTENT')
  console.log('[v0] extractTag CONTENT result length:', content?.length || 0)
  if (content && content.length > 50) {
    const result = {
      title: extractTag(text, 'TITLE') || 'Untitled Guide',
      content,
      meta_title: extractTag(text, 'META_TITLE') || '',
      meta_description: extractTag(text, 'META_DESCRIPTION') || '',
      excerpt: extractTag(text, 'EXCERPT') || '',
      faqs: parseFaqs(extractTag(text, 'FAQS')),
    }
    console.log('[v0] Delimited parse SUCCESS. Title:', result.title, 'Content length:', content.length)
    return result
  }

  // FALLBACK 1: Direct JSON parse
  try {
    const parsed = JSON.parse(text)
    console.log('[v0] Direct JSON parse SUCCESS')
    return parsed
  } catch { /* continue */ }

  // FALLBACK 2: JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      console.log('[v0] Code block JSON parse SUCCESS')
      return parsed
    } catch {
      // Try fixing newlines in code block JSON
      try {
        const parsed = JSON.parse(fixJsonNewlines(codeBlockMatch[1].trim()))
        console.log('[v0] Code block fixed JSON parse SUCCESS')
        return parsed
      } catch { /* continue */ }
    }
  }

  // FALLBACK 3: Extract outermost braces and fix newlines
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = text.slice(braceStart, braceEnd + 1)
    try {
      const parsed = JSON.parse(candidate)
      console.log('[v0] Brace extraction JSON parse SUCCESS')
      return parsed
    } catch { /* continue */ }

    try {
      const parsed = JSON.parse(fixJsonNewlines(candidate))
      console.log('[v0] Fixed newlines JSON parse SUCCESS')
      return parsed
    } catch (e) {
      console.error('[v0] Fixed newlines JSON still failed:', (e as Error).message)
    }
  }

  // FALLBACK 4: If text looks like markdown with ## headings, treat the entire response as content
  if (text.includes('## ') && text.length > 500) {
    console.log('[v0] FALLBACK: Treating entire response as raw markdown content')
    // Extract a title from the first line or first heading
    const titleMatch = text.match(/^#\s+(.+)/m) || text.match(/^(.+)\n/)
    const title = titleMatch ? titleMatch[1].trim() : 'Guide'
    // Strip any leading # heading since it becomes the title
    const body = text.replace(/^#\s+.+\n?/, '').trim()
    return {
      title,
      content: body,
      meta_title: '',
      meta_description: '',
      excerpt: body.substring(0, 200),
      faqs: [],
    }
  }

  console.error('[v0] ALL parse methods failed. Full text:', text.substring(0, 1000))
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

  let post = parseAIResponse(result.text)
  if (!post || !post.content) {
    const preview = result.text?.substring(0, 300) || 'empty'
    console.error(`[v0] ALL PARSERS FAILED for ${city}. Length: ${result.text?.length}. Full preview:`, preview)
    throw new Error(`AI returned unparseable content (len: ${result.text?.length || 0}). First 200 chars: ${result.text?.substring(0, 200)}`)
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
        `Please rewrite it to be at least ${minWords} words. Add more detail, expand each section, include more specific tips and recommendations.\n\n` +
        `Respond using EXACTLY this delimited format:\n` +
        `<TITLE>title</TITLE>\n<META_TITLE>seo title</META_TITLE>\n<META_DESCRIPTION>meta desc</META_DESCRIPTION>\n<EXCERPT>excerpt</EXCERPT>\n` +
        `<CONTENT>\nfull markdown article\n</CONTENT>\n<FAQS>\nQ: question?\nA: answer.\n</FAQS>\n\n` +
        `Original content:\n${content}`
    await delay(2000)

    result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: expansionPrompt,
    })

    const expandedPost = parseAIResponse(result.text)
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

  // Final validation -- only reject truly empty/broken responses (under 250 words)
  if (wordCount < 250) {
    throw new Error(`Content too short: ${wordCount} words (minimum 250)`)
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
      const post = parseAIResponse(result.text)
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
