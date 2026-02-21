import type { MetadataRoute } from 'next'
import { neon } from '@neondatabase/serverless'
import { SITE_URL } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // ── Static pages ──────────────────────────────────────────
  entries.push(
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/regions`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  )

  // Blog category pages
  const categories = ['soft-play', 'playground', 'trampoline-park', 'adventure', 'farm']
  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/blog/${cat}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // ── Dynamic pages from DB ─────────────────────────────────
  if (!process.env.DATABASE_URL) return entries

  try {
    const sql = neon(process.env.DATABASE_URL)

    // City pages (soft-play/[city]) -- only cities with venues
    const cities = await sql`
      SELECT slug FROM city_pages
      WHERE venue_count > 0
      ORDER BY venue_count DESC
    `
    for (const c of cities) {
      entries.push({
        url: `${SITE_URL}/soft-play/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // All published venue pages
    const venues = await sql`
      SELECT slug, updated_at FROM venues
      WHERE status = 'active' AND slug IS NOT NULL
      ORDER BY COALESCE(google_rating, 0) DESC
    `
    for (const v of venues) {
      entries.push({
        url: `${SITE_URL}/venue/${v.slug}`,
        lastModified: v.updated_at ? new Date(v.updated_at as string) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }

    // Region pages
    const regions = await sql`
      SELECT DISTINCT LOWER(REPLACE(REPLACE(COALESCE(county, ''), ' ', '-'), '''', '')) as slug
      FROM venues
      WHERE status = 'active' AND county IS NOT NULL AND county != ''
    `
    for (const r of regions) {
      if (r.slug) {
        entries.push({
          url: `${SITE_URL}/regions/${r.slug}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    // Published blog posts
    const blogPosts = await sql`
      SELECT slug, published_at FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
    `
    for (const bp of blogPosts) {
      entries.push({
        url: `${SITE_URL}/blog/post/${bp.slug}`,
        lastModified: bp.published_at ? new Date(bp.published_at as string) : now,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }

    // Guide pages (guides/[city] and guides/[city]/[subpage])
    const guides = await sql`
      SELECT
        LOWER(REPLACE(city, ' ', '-')) as city_slug,
        slug as subpage_slug,
        published_at
      FROM blog_posts
      WHERE status = 'published' AND content_type IN ('area_guide', 'intent_page', 'region_guide')
      ORDER BY published_at DESC
    `
    const guideCities = new Set<string>()
    for (const g of guides) {
      const citySlug = g.city_slug as string
      if (citySlug && !guideCities.has(citySlug)) {
        guideCities.add(citySlug)
        entries.push({
          url: `${SITE_URL}/guides/${citySlug}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
      if (g.subpage_slug) {
        entries.push({
          url: `${SITE_URL}/guides/${citySlug}/${g.subpage_slug}`,
          lastModified: g.published_at ? new Date(g.published_at as string) : now,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }
    }
  } catch (err) {
    console.error('[sitemap] DB query failed:', err)
    // Return static entries only
  }

  return entries
}
