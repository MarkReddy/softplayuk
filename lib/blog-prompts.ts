// Prompt templates for SEO content generation
// Template A = City Guide, Template B = Area/Borough, Template C = Intent Page

export const INTENT_TYPES = {
  'toddler-soft-play': {
    label: 'Toddler Soft Play',
    h1: 'Toddler Soft Play in {City}',
    titleTag: 'Toddler Soft Play in {City} (2026) | Softplay UK',
    focus: 'toddler-specific features, baby areas, age-appropriate equipment, and safety for under-5s',
  },
  'birthday-parties': {
    label: 'Birthday Parties',
    h1: 'Soft Play Birthday Parties in {City}',
    titleTag: 'Soft Play Birthday Parties in {City} (2026) | Softplay UK',
    focus: 'party packages, party rooms, catering options, booking tips, and what to expect',
  },
  'cheap-soft-play': {
    label: 'Cheap Soft Play',
    h1: 'Cheap Soft Play in {City}',
    titleTag: 'Cheap Soft Play in {City} (2026) | Softplay UK',
    focus: 'budget-friendly options, free play areas, off-peak discounts, and value-for-money tips',
  },
  'sen-friendly': {
    label: 'SEN-Friendly',
    h1: 'SEN-Friendly Soft Play in {City}',
    titleTag: 'SEN-Friendly Soft Play in {City} (2026) | Softplay UK',
    focus: 'sensory-friendly sessions, quiet hours, accessibility features, and inclusive play environments',
  },
  'rainy-day-activities': {
    label: 'Rainy Day Activities',
    h1: 'Rainy Day Activities in {City}',
    titleTag: 'Rainy Day Activities for Kids in {City} (2026) | Softplay UK',
    focus: 'indoor play options for wet weather, variety of activities beyond soft play, and practical tips for rainy days with children',
  },
} as const

export type IntentType = keyof typeof INTENT_TYPES

export interface VenueData {
  name: string
  slug: string
  category: string
  google_rating: number | null
  description: string | null
  city: string
  county: string | null
  has_party_rooms: boolean
  is_sen_friendly: boolean
  has_baby_area: boolean
  has_cafe: boolean
  has_parking: boolean
  price_range: string | null
  age_range: string | null
}

function formatVenueList(venues: VenueData[]): string {
  return venues.map((v, i) => {
    const parts = [`${i + 1}. ${v.name}`]
    if (v.category) parts.push(`Type: ${v.category.replace(/_/g, ' ')}`)
    if (v.google_rating) parts.push(`Google rating: ${v.google_rating}/5`)
    if (v.age_range) parts.push(`Ages: ${v.age_range}`)
    if (v.price_range) parts.push(`Price: ${v.price_range}`)
    const features: string[] = []
    if (v.has_baby_area) features.push('baby area')
    if (v.has_party_rooms) features.push('party rooms')
    if (v.is_sen_friendly) features.push('SEN friendly')
    if (v.has_cafe) features.push('cafe')
    if (v.has_parking) features.push('parking')
    if (features.length > 0) parts.push(`Features: ${features.join(', ')}`)
    if (v.description) parts.push(`Notes: ${v.description.substring(0, 120)}`)
    return parts.join(' | ')
  }).join('\n')
}

const QUALITY_RULES = `
STRICT QUALITY RULES:
- Write in British English (centres, colour, favourite, etc.)
- Tone: warm, helpful, authoritative -- like a trusted local parent giving advice
- Do NOT use "In conclusion" or similar AI-sounding phrases
- Do NOT fabricate ratings, prices, review counts, or any numerical claims not provided in the data
- If data is missing for a venue, omit it or use careful phrasing like "check the listing for current pricing"
- Do NOT repeat the city name unnaturally -- vary your phrasing
- Make content specific, practical, and genuinely useful to parents
- Do NOT use generic filler like "a vibrant city with much to offer"
- Include only one H1 (provided as the title). Use ## for H2 and ### for H3 only
- Every venue mention should include a markdown link in this exact format: [Venue Name](/venue/venue-slug) -- I will provide the slugs
- Do NOT hardcode any external URLs
`

const JSON_FORMAT = `
You MUST respond with ONLY a valid JSON object (no markdown code blocks, no extra text) with these exact fields:
{
  "title": "the H1 title",
  "content": "the full article body in markdown (do NOT include the H1 title at the top)",
  "meta_title": "SEO title tag (max 60 chars)",
  "meta_description": "meta description (max 160 chars, include primary keyword and CTA)",
  "og_title": "Open Graph title",
  "og_description": "Open Graph description",
  "excerpt": "short excerpt for listings (max 200 chars)",
  "faqs": [{"question": "...", "answer": "..."}]
}
`

export function buildCityGuidePrompt(
  city: string,
  county: string,
  venueCount: number,
  venues: VenueData[],
  nearbyAreas: string[],
  nearbyCities: string[],
): string {
  const venueList = formatVenueList(venues)
  const partyVenues = venues.filter(v => v.has_party_rooms).map(v => v.name)
  const senVenues = venues.filter(v => v.is_sen_friendly).map(v => v.name)
  const toddlerVenues = venues.filter(v => v.has_baby_area).map(v => v.name)

  return `Write a comprehensive, SEO-optimised city guide article for Softplay UK (www.softplayuk.co.uk).

TITLE (H1): Best Soft Play Centres in ${city}

TARGET WORD COUNT: 1,400--2,200 words

MANDATORY ARTICLE STRUCTURE:

## Introduction (150--220 words)
- Include primary keyword "soft play in ${city}" and variations
- Mention there are ${venueCount} venues listed in ${city}${county ? ` (${county})` : ''}
- Soft CTA to browse all listings

## Quick Summary
A bullet list formatted as a "featured snippet" block:
- Number of venues: ${venueCount}
${toddlerVenues.length > 0 ? `- Best for toddlers: ${toddlerVenues[0]}` : '- Best for toddlers: (mention the most suitable from the list)'}
${partyVenues.length > 0 ? `- Best for birthday parties: ${partyVenues[0]}` : ''}
${venues.find(v => v.has_parking) ? `- Parking-friendly: ${venues.find(v => v.has_parking)!.name}` : ''}
- Only include average rating or price range if you have REAL data from the venue list below

## Top-Rated Soft Play Centres in ${city}
Cover ${Math.min(venues.length, 10)} venues. For each venue include:
- Name (as a link: [Name](/venue/slug))
- Area/borough
- Best for (toddlers / mixed ages / parties)
- Age suitability
- Key features (from the data I provide)
- A practical parent tip
- CTA: "View full listing on Softplay UK" linking to /venue/slug

## Soft Play by Area in ${city}
${nearbyAreas.length > 0 ? `Mention these areas/boroughs: ${nearbyAreas.join(', ')}` : 'Mention key districts/areas of the city'}
Include internal link placeholders to area pages (e.g., "Read our guide to [soft play in North London](/guides/${city.toLowerCase().replace(/\s+/g, '-')}/north-london)")

## What to Look for in a Soft Play Centre
Cover: cleanliness, age-zones, peak times, SEN-friendly options, parking/transport, cafe/food

## Soft Play Birthday Parties in ${city}
${partyVenues.length > 0 ? `Mention these party-capable venues: ${partyVenues.join(', ')}` : 'Give general guidance about what to look for'}
Explain what to look for in party packages

## FAQs
6--8 questions with 40--70 word answers each targeting real search intent such as:
- "What is the best soft play in ${city}?"
- "How much does soft play cost in ${city}?"
- "Are there soft play centres for toddlers in ${city}?"
- "Which soft play centres in ${city} do birthday parties?"
${senVenues.length > 0 ? `- "Are there SEN-friendly soft play options in ${city}?"` : ''}

## (No heading -- just a closing paragraph)
Strong but natural CTA to view all ${city} venues.
Suggest 2--3 related guides using internal link format:
${nearbyCities.map(c => `- [Soft play in ${c}](/guides/${c.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

VENUE DATA (use these exact names and slugs):
${venueList}

${QUALITY_RULES}
${JSON_FORMAT}`
}

export function buildAreaGuidePrompt(
  area: string,
  city: string,
  venues: VenueData[],
  nearbyCities: string[],
): string {
  const venueList = formatVenueList(venues)

  return `Write an SEO-optimised area/borough guide for Softplay UK (www.softplayuk.co.uk).

TITLE (H1): Soft Play in ${area}, ${city}

TARGET WORD COUNT: 1,000--1,600 words

MANDATORY STRUCTURE:

## Introduction (100--150 words)
A short local intro that references the area specifically. Do NOT write generic praise about the city.
Mention the number of venues: ${venues.length}

## Top Soft Play Centres in ${area}
Cover ${Math.min(venues.length, 8)} venues with:
- Name as link: [Name](/venue/slug)
- Key features and what makes it special
- Practical parent tip

## Perfect For...
Sections on: toddlers, rainy days, birthday parties -- mention specific venues where relevant

## FAQs
5--7 questions targeting local search intent for "${area}, ${city}"

## Closing
CTA to view all venues in ${area}.
Related guides:
${nearbyCities.map(c => `- [Soft play in ${c}](/guides/${c.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

VENUE DATA:
${venueList}

${QUALITY_RULES}
${JSON_FORMAT}`
}

export function buildIntentPagePrompt(
  intent: IntentType,
  city: string,
  venues: VenueData[],
  nearbyCities: string[],
): string {
  const intentConfig = INTENT_TYPES[intent]
  const venueList = formatVenueList(venues)
  const h1 = intentConfig.h1.replace('{City}', city)

  return `Write an SEO-optimised intent page for Softplay UK (www.softplayuk.co.uk).

TITLE (H1): ${h1}

TARGET WORD COUNT: 1,200--1,800 words

FOCUS TOPIC: ${intentConfig.focus}

MANDATORY STRUCTURE:

## Introduction (100--150 words)
Directly address the intent. Parents searching for "${h1.toLowerCase()}" want specific, actionable information.

## Best Picks
A curated list of ${Math.min(venues.length, 6)} venues that are most relevant to this intent:
- Name as link: [Name](/venue/slug)
- Why it is a good pick for this specific intent
- Key practical detail

## ${intentConfig.label} Guide
A detailed guidance section (400--600 words) focused on the intent:
${intent === 'birthday-parties' ? '- What to expect from party packages\n- How to book\n- What to ask the venue\n- Tips for a stress-free party' : ''}
${intent === 'toddler-soft-play' ? '- What to look for in a toddler area\n- Safety considerations\n- Best times to visit\n- What to bring' : ''}
${intent === 'cheap-soft-play' ? '- How to find deals and off-peak pricing\n- Free alternatives\n- Value tips\n- What to check before booking' : ''}
${intent === 'sen-friendly' ? '- What makes a venue SEN-friendly\n- Sensory-friendly sessions\n- Questions to ask\n- How to prepare for a visit' : ''}
${intent === 'rainy-day-activities' ? '- Types of indoor activities available\n- Planning a rainy day out\n- What to pack\n- Making the most of indoor play' : ''}

## Pricing Tips
General guidance only -- do NOT fabricate specific prices unless data is provided.

## FAQs
5--7 questions targeting "${h1.toLowerCase()}" search intent

## Closing
CTA to browse and compare all listings in ${city}.
Related guides:
${nearbyCities.map(c => `- [${intentConfig.h1.replace('{City}', c)}](/guides/${c.toLowerCase().replace(/\s+/g, '-')}/${intent})`).join('\n')}
- [Best soft play in ${city}](/guides/${city.toLowerCase().replace(/\s+/g, '-')})

VENUE DATA:
${venueList}

${QUALITY_RULES}
${JSON_FORMAT}`
}
