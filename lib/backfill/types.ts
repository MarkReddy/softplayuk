export type BackfillMode = 'full_uk' | 'region' | 'city' | 'radius'

export interface BackfillConfig {
  mode: BackfillMode
  provider: 'google_places'
  region?: string
  city?: string
  lat?: number
  lng?: number
  radiusKm?: number
  enrichDetails?: boolean
  dryRun?: boolean
}

export interface GridCell {
  lat: number
  lng: number
  radiusMetres: number
  label: string
}

export interface DiscoveredVenue {
  googlePlaceId: string
  name: string
  lat: number
  lng: number
  address: string
  city: string
  county: string
  postcode: string
  googleRating: number | null
  googleReviewCount: number | null
  types: string[]
  businessStatus: string
  photoReferences: string[]
  phone?: string | null
  website?: string | null
  openingHours?: { day: string; open: string; close: string }[]
}

export type BackfillRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'

export interface BackfillProgress {
  runId: number
  status: BackfillRunStatus
  mode: BackfillMode
  region: string | null
  totalCells: number
  processedCells: number
  discovered: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  enriched: number
  startedAt: string
  updatedAt: string
  error: string | null
  durationMs: number | null
}

// ─── Grid Generation ────────────────────────────────────────

const UK_BOUNDS = { minLat: 49.9, maxLat: 58.7, minLng: -8.2, maxLng: 1.8 }

const REGION_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'west-midlands': { minLat: 52.2, maxLat: 52.9, minLng: -2.3, maxLng: -1.3 },
  'east-midlands': { minLat: 52.4, maxLat: 53.2, minLng: -1.8, maxLng: -0.7 },
  'greater-london': { minLat: 51.28, maxLat: 51.69, minLng: -0.51, maxLng: 0.33 },
  'greater-manchester': { minLat: 53.3, maxLat: 53.7, minLng: -2.7, maxLng: -1.9 },
  'south-east': { minLat: 50.7, maxLat: 51.9, minLng: -1.9, maxLng: 1.5 },
  'south-west': { minLat: 50.0, maxLat: 52.0, minLng: -5.7, maxLng: -1.7 },
  'north-west': { minLat: 53.0, maxLat: 55.8, minLng: -3.6, maxLng: -2.0 },
  'north-east': { minLat: 54.4, maxLat: 55.8, minLng: -2.5, maxLng: -1.0 },
  'yorkshire': { minLat: 53.3, maxLat: 54.5, minLng: -2.5, maxLng: -0.5 },
  'east-of-england': { minLat: 51.5, maxLat: 52.9, minLng: -0.5, maxLng: 1.8 },
  'wales': { minLat: 51.3, maxLat: 53.5, minLng: -5.3, maxLng: -2.6 },
  'scotland': { minLat: 54.6, maxLat: 58.7, minLng: -7.6, maxLng: -0.7 },
  'northern-ireland': { minLat: 54.0, maxLat: 55.4, minLng: -8.2, maxLng: -5.4 },
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'london': { lat: 51.5074, lng: -0.1278 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'leeds': { lat: 53.8008, lng: -1.5491 },
  'sheffield': { lat: 53.3811, lng: -1.4701 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'newcastle': { lat: 54.9783, lng: -1.6178 },
  'nottingham': { lat: 52.9548, lng: -1.1581 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'cardiff': { lat: 51.4816, lng: -3.1791 },
  'belfast': { lat: 54.5973, lng: -5.9301 },
  'coventry': { lat: 52.4068, lng: -1.5197 },
  'leicester': { lat: 52.6369, lng: -1.1398 },
  'wolverhampton': { lat: 52.5870, lng: -2.1288 },
  'stoke-on-trent': { lat: 53.0027, lng: -2.1794 },
  'derby': { lat: 52.9225, lng: -1.4746 },
  'southampton': { lat: 50.9097, lng: -1.4044 },
  'brighton': { lat: 50.8225, lng: -0.1372 },
  'oxford': { lat: 51.7520, lng: -1.2577 },
  'cambridge': { lat: 52.2053, lng: 0.1218 },
  'york': { lat: 53.9591, lng: -1.0815 },
  'bath': { lat: 51.3811, lng: -2.3590 },
  'norwich': { lat: 52.6309, lng: 1.2974 },
  'exeter': { lat: 50.7184, lng: -3.5339 },
  'hull': { lat: 53.7676, lng: -0.3274 },
  'bradford': { lat: 53.7960, lng: -1.7594 },
}

export function generateGrid(config: BackfillConfig): GridCell[] {
  const stepKm = 20
  const radiusMetres = 16000

  if (config.mode === 'city') {
    const slug = (config.city || '').toLowerCase().replace(/\s+/g, '-')
    const coords = CITY_COORDS[slug]
    if (!coords) {
      return [{ lat: 52.5, lng: -1.9, radiusMetres: 25000, label: config.city || 'Unknown' }]
    }
    const cells: GridCell[] = []
    for (let dlat = -0.1; dlat <= 0.1; dlat += 0.1) {
      for (let dlng = -0.15; dlng <= 0.15; dlng += 0.15) {
        cells.push({
          lat: Math.round((coords.lat + dlat) * 10000) / 10000,
          lng: Math.round((coords.lng + dlng) * 10000) / 10000,
          radiusMetres,
          label: `${config.city} (${cells.length + 1})`,
        })
      }
    }
    return cells
  }

  let bounds: typeof UK_BOUNDS

  if (config.mode === 'region') {
    const slug = (config.region || '').toLowerCase().replace(/\s+/g, '-')
    bounds = REGION_BOUNDS[slug] || UK_BOUNDS
  } else if (config.mode === 'radius') {
    const r = (config.radiusKm || 25) / 111
    bounds = {
      minLat: (config.lat || 52.5) - r,
      maxLat: (config.lat || 52.5) + r,
      minLng: (config.lng || -1.9) - r * 1.6,
      maxLng: (config.lng || -1.9) + r * 1.6,
    }
  } else {
    bounds = UK_BOUNDS
  }

  const cells: GridCell[] = []
  const latStep = stepKm / 111
  const midLat = (bounds.minLat + bounds.maxLat) / 2
  const lngStep = stepKm / (111 * Math.cos((midLat * Math.PI) / 180))

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      cells.push({
        lat: Math.round(lat * 10000) / 10000,
        lng: Math.round(lng * 10000) / 10000,
        radiusMetres,
        label: `Grid ${cells.length + 1} (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      })
    }
  }
  return cells
}

export const AVAILABLE_REGIONS = Object.keys(REGION_BOUNDS).map((slug) => ({
  slug,
  label: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}))

export const AVAILABLE_CITIES = Object.keys(CITY_COORDS).map((slug) => ({
  slug,
  label: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}))
