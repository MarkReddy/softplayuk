/**
 * Backfill provider interface.
 * Any data source (Google Places, Yelp, OSM, manual CSV) implements this.
 */

export interface DiscoveredVenue {
  externalId: string
  name: string
  addressLine1: string
  addressLine2?: string
  city: string
  county?: string
  postcode: string
  country: string
  lat: number
  lng: number
  phone?: string
  website?: string
  googleRating?: number
  googleReviewCount?: number
  priceLevel?: number
  description?: string
  types?: string[]
  openingHours?: { day: string; open: string; close: string }[]
  photos?: { url: string; attribution: string }[]
}

export interface BackfillProvider {
  name: string
  /** Search for venues in a given area */
  searchArea(lat: number, lng: number, radiusMetres: number): Promise<DiscoveredVenue[]>
  /** Get full details for a single venue by external ID */
  getDetails(externalId: string): Promise<DiscoveredVenue | null>
}

export interface BackfillConfig {
  provider: string
  regionLabel: string
  boundingBox: {
    north: number
    south: number
    east: number
    west: number
  }
  gridStepKm: number
  searchRadiusKm: number
  searchKeywords: string[]
  maxResultsPerCell?: number
}

export type BackfillRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BackfillRun {
  id: number
  provider: string
  regionLabel: string
  status: BackfillRunStatus
  totalCells: number
  completedCells: number
  venuesDiscovered: number
  venuesInserted: number
  venuesUpdated: number
  venuesSkipped: number
  errors: string[]
  config: BackfillConfig
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}
