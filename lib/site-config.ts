/**
 * Single source of truth for the canonical site URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL env var (set in Vercel project settings)
 * 2. Hardcoded production domain
 *
 * NEVER falls back to VERCEL_URL -- that would produce
 * *.vercel.app URLs in sitemaps, OG tags, and canonical links.
 */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://softplayuk.co.uk').replace(
    /\/$/,
    ''
  )
