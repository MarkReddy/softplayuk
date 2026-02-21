import type { MetadataRoute } from 'next'
import { neon } from '@neondatabase/serverless'
import { SITE_URL } from '@/lib/site-config'

const sql = neon(process.env.DATASITE_URL!)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages
  entries.push(
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/regions`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  )

  // Blog category pages
  const categories = ['soft-play', 'playground', 'trampoline-park', 'adventure', 'farm']
  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/blog/${cat}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  try {
    // Region pages
    const regions = await sql`
      SELECT DISTINCT LOWER(REPLACE(REPLACE(COALESCE(county, ''), ' ', '-'), '''', '')) as slug
      FROM venues WHERE status = 'active' AND county IS NOT NULL AND county != ''
    `
    for (const r of regions) {
      entries.push({
        url: `${SITE_URL}/regions/${r.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    // City pages
    const cities = await sql`SELECT slug FROM city_pages ORDER BY venue_count DESC`
    for (const c of cities) {
      entries.push({
        url: `${SITE_URL}/soft-play/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }

    // Published blog posts
    const blogPosts = await sql`SELECT slug, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC`
    for (const bp of blogPosts) {
      entries.push({
        url: `${SITE_URL}/blog/post/${bp.slug}`,
        lastModified: bp.published_at ? new Date(bp.published_at as string) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }

    // Individual venue pages (top 2000 by rating)
    const venues = await sql`
      SELECT slug FROM venues WHERE status = 'active' AND slug IS NOT NULL
      ORDER BY COALESCE(google_rating, 0) DESC LIMIT 2000
    `
    for (const v of venues) {
      entries.push({
        url: `${SITE_URL}/venue/${v.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      })
    }
  } catch {
    // DB unavailable -- return static entries only
  }

  return entries
}
