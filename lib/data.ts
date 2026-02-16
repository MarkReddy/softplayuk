import type { Venue, DataSource } from './types'

// ─── Pure Utility Functions (no data, no DB) ───────────────

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'soft_play': return 'Soft Play Centre'
    case 'playground': return 'Public Play Area'
    case 'trampoline_park': return 'Trampoline Park'
    case 'adventure': return 'Adventure Play'
    case 'farm': return 'Farm Park'
    case 'park': return 'Public Park'
    case 'zoo': return 'Zoo / Aquarium'
    default: return 'Play Venue'
  }
}

export function getCategoryStyle(category: string): { bg: string; text: string } {
  switch (category) {
    case 'soft_play': return { bg: 'bg-primary/10', text: 'text-primary' }
    case 'playground': return { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400' }
    case 'trampoline_park': return { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400' }
    case 'adventure': return { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400' }
    case 'farm': return { bg: 'bg-lime-100 dark:bg-lime-950', text: 'text-lime-700 dark:text-lime-400' }
    default: return { bg: 'bg-secondary', text: 'text-muted-foreground' }
  }
}

export function isPublicArea(category: string): boolean {
  return ['playground', 'park'].includes(category)
}

export function isValidUKPostcode(postcode: string): boolean {
  const pattern = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i
  return pattern.test(postcode.trim())
}

export function getPriceBandLabel(band: number): string {
  switch (band) {
    case 1: return 'Budget-friendly'
    case 2: return 'Mid-range'
    case 3: return 'Premium'
    default: return 'Varies'
  }
}

export function getAgeLabel(min: number, max: number): string {
  if (min === 0 && max <= 4) return 'Babies & toddlers'
  if (min === 0 && max <= 8) return 'Under 8s'
  if (min === 0 && max >= 12) return 'All ages'
  return `Ages ${min}-${max}`
}

export function getBlendedRating(venue: Venue): number {
  if (venue.googleRating != null && venue.firstPartyRating > 0) {
    return venue.googleRating * 0.4 + venue.firstPartyRating * 0.6
  }
  if (venue.googleRating != null) return venue.googleRating
  return venue.firstPartyRating
}

export function getSourceLabel(source: DataSource): string {
  switch (source) {
    case 'google_places': return 'Google'
    case 'osm': return 'OpenStreetMap'
    case 'manual': return 'Softplay UK'
    case 'first_party': return 'Parent-submitted'
    default: return 'Softplay UK'
  }
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
