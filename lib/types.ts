// ─── Data Source Tracking ─────────────────────────────────────
export type DataSource = 'google_places' | 'osm' | 'manual' | 'first_party'

export interface SourceAttribution {
  source: DataSource
  sourceId?: string // e.g. place_id, osm_id
  sourceUrl?: string
  lastFetchedAt?: string
  attribution?: string // e.g. "Google", "OpenStreetMap contributors"
}

// ─── Venue (Core Schema) ─────────────────────────────────────
export interface Venue {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string

  // Location
  address: string
  postcode: string
  city: string
  area: string
  localAuthority?: string
  lat: number
  lng: number

  // Contact
  phone: string
  website: string

  // Media
  imageUrl: string
  images: VenueImage[]

  // Categorisation
  primaryCategory: string // e.g. "soft_play", "adventure_play", "sensory_play"
  ageRange: { min: number; max: number }
  priceBand: 1 | 2 | 3
  amenities: Amenity[]

  // Opening hours (structured)
  openingHours: OpeningHours

  // Flags
  senFriendly: boolean
  partyRooms: boolean
  verified: boolean
  featured: boolean

  // Ratings (split by source)
  googleRating?: number
  googleReviewCount?: number
  firstPartyRating: number
  firstPartyReviewCount: number
  cleanlinessScore: number // parent-reported, always first-party

  // Data provenance
  sourcePriority: DataSource
  sources: SourceAttribution[]
  lastRefreshedAt: string
  createdAt: string

  // Trust / governance
  ofstedUrn?: string
  ofstedLink?: string
  hasOfstedRecord?: boolean
}

// ─── Venue Image ─────────────────────────────────────────────
export interface VenueImage {
  url: string
  source: DataSource
  attribution?: string // required for Google photos
  uploadedBy?: string // user id for first-party
}

// ─── Amenity ─────────────────────────────────────────────────
export interface Amenity {
  id: string
  name: string
  icon: string
  source?: DataSource
}

// ─── Opening Hours ───────────────────────────────────────────
export interface OpeningHours {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

// ─── Review ──────────────────────────────────────────────────
export interface Review {
  id: string
  venueId: string

  // Source tracking
  source: 'first_party' | 'google'
  attribution?: string // "Google" for external reviews

  // Author
  userName: string

  // Ratings
  rating: number
  cleanlinessRating?: number // only for first-party
  valueRating?: number // only for first-party
  ageSuitabilityRating?: number // only for first-party

  // Content
  comment: string
  helpful: number

  createdAt: string
}

// ─── Search ──────────────────────────────────────────────────
export interface SearchFilters {
  ageGroup?: string
  priceBand?: string
  facilities?: string[]
  cleanlinessMin?: number
  senFriendly?: boolean
  openToday?: boolean
  sortBy?: 'rating' | 'distance' | 'price' | 'cleanliness'
  radius?: number
}

export interface SearchResult extends Venue {
  distance: number
}

// ─── City / Location Pages ───────────────────────────────────
export interface CityPage {
  slug: string
  city: string
  area?: string
  description: string
  venueCount: number // derived from actual venue data
  lat: number // city centroid for radius queries
  lng: number
}

// ─── Term Dates (GOV.UK) ────────────────────────────────────
export interface TermDates {
  localAuthority: string
  sourceUrl: string
  halfTermWeeks: {
    label: string // e.g. "October half-term 2025"
    startDate: string
    endDate: string
  }[]
}
