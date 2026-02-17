// Prompt templates for SEO content generation
// Template A = City Guide, Template B = Area/Borough, Template C = Intent Page

export const SOFT_PLAY_CATEGORIES = ['soft_play', 'adventure', 'trampoline_park', 'farm'] as const
export const EXCLUDED_CATEGORIES = ['playground'] as const

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
  has_outdoor: boolean
  price_range: string | null
  age_range: string | null
}

function formatVenueList(venues: VenueData[]): string {
  return venues.map((v, i) => {
    const parts = [`${i + 1}. ${v.name} (slug: ${v.slug})`]
    if (v.category) parts.push(`Type: ${v.category.replace(/_/g, ' ')}`)
    if (v.google_rating) parts.push(`Google rating: ${v.google_rating}/5`)
    if (v.age_range) parts.push(`Ages: ${v.age_range}`)
    if (v.price_range) parts.push(`Price: ${v.price_range}`)
    const features: string[] = []
    if (v.has_baby_area) features.push('baby/toddler area')
    if (v.has_party_rooms) features.push('party rooms')
    if (v.is_sen_friendly) features.push('SEN friendly')
    if (v.has_cafe) features.push('cafe')
    if (v.has_parking) features.push('parking')
    if (v.has_outdoor) features.push('outdoor area')
    if (features.length > 0) parts.push(`Features: ${features.join(', ')}`)
    if (v.description) parts.push(`Notes: ${v.description.substring(0, 150)}`)
    return parts.join(' | ')
  }).join('\n')
}

const QUALITY_RULES = `
STRICT QUALITY RULES:
- Write in British English (centres, colour, favourite, etc.)
- Tone: warm, helpful, authoritative -- like a trusted local parent giving advice
- Do NOT use "In conclusion", "Whether you're looking for...", or similar AI-sounding phrases
- Do NOT fabricate ratings, prices, review counts, or any numerical claims not provided in the data
- If data is missing for a venue, omit it or use careful phrasing like "check the listing for current pricing"
- Do NOT repeat the city name unnaturally -- vary your phrasing
- Make content specific, practical, and genuinely useful to parents
- Do NOT use generic filler like "a vibrant city with much to offer" or "{City} is a wonderful town"
- Include only one H1 (provided as the title). Use ## for H2 and ### for H3 only
- Every venue mention should include a markdown link: [Venue Name](/venue/venue-slug) -- use the exact slugs I provide
- Do NOT hardcode any external URLs
- IMPORTANT: All venues listed are PRIVATE, PAID indoor play centres (not public parks or free playgrounds). Do not describe them as parks or playgrounds.
`

const OUTPUT_FORMAT = `
You MUST respond using EXACTLY this delimited format. Each section starts with the tag on its own line and ends with the closing tag on its own line.
Do NOT wrap in code blocks or add any text outside the tags.

<TITLE>the H1 title</TITLE>
<META_TITLE>SEO title tag (max 60 chars, include year 2026)</META_TITLE>
<META_DESCRIPTION>meta description (155-160 chars, include primary keyword + CTA, mention indoor soft play centres)</META_DESCRIPTION>
<EXCERPT>short excerpt for listings (max 200 chars)</EXCERPT>
<CONTENT>
the full article body in markdown (do NOT include the H1 title at the top -- it is rendered separately)
</CONTENT>
<FAQS>
Q: First question here?
A: Answer here (40-70 words).

Q: Second question here?
A: Answer here (40-70 words).
</FAQS>
`

const EXPANSION_INSTRUCTION = `
CRITICAL: This content MUST be 1,400--2,200 words long. Do NOT write a short summary.
Write detailed, comprehensive paragraphs. Each venue description should be 160--220 words.
If you find yourself finishing under 1,400 words, add more practical detail: parent tips, comparisons between venues, area-specific advice, and expand the FAQ answers to 40--70 words each.
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
  const partyVenues = venues.filter(v => v.has_party_rooms)
  const senVenues = venues.filter(v => v.is_sen_friendly)
  const toddlerVenues = venues.filter(v => v.has_baby_area)
  const cafeVenues = venues.filter(v => v.has_cafe)
  const parkingVenues = venues.filter(v => v.has_parking)

  const quickPicks: string[] = []
  quickPicks.push(`- Number of indoor soft play venues: ${venueCount}`)
  if (venues[0]) quickPicks.push(`- Best overall: ${venues[0].name}`)
  if (toddlerVenues[0]) quickPicks.push(`- Best for toddlers: ${toddlerVenues[0].name}`)
  if (partyVenues[0]) quickPicks.push(`- Best for birthday parties: ${partyVenues[0].name}`)
  if (parkingVenues[0]) quickPicks.push(`- Parking-friendly: ${parkingVenues[0].name}`)
  if (cafeVenues[0]) quickPicks.push(`- Best cafe: ${cafeVenues[0].name}`)

  return `Write a comprehensive, SEO-optimised city guide article for Softplay UK (www.softplayuk.co.uk).

TITLE (H1): Best Soft Play Centres in ${city}

${EXPANSION_INSTRUCTION}

MANDATORY ARTICLE STRUCTURE (follow this EXACTLY):

## Introduction (200--250 words)
- Use UK English throughout
- Include keyword variations: "soft play in ${city}", "indoor play centres ${city}", "soft play near ${city}"
- State clearly that there are ${venueCount} private indoor soft play venues in ${city}${county ? ` (${county})` : ''}
- Set expectations: this guide covers indoor paid soft play centres only (not public parks or free playgrounds)
- Soft CTA to browse all listings

## Quick Picks (Featured Snippet Box)
Format as a summary bullet list:
${quickPicks.join('\n')}
- Only include data points you have REAL data for from the venue list below

## Top Soft Play Centres in ${city} (Paid Venues)
Cover ${Math.min(venues.length, 10)} venues. Each venue write-up MUST be 160--220 words and include:
- Name as a markdown link: [Venue Name](/venue/venue-slug)
- Area/neighbourhood within ${city}
- Age suitability (from data if available)
- Key facilities: cafe, parking, toilets, baby change, party rooms (only mention what the data confirms)
- A specific, practical "Parent tip" (e.g. "Arrive before 10am on weekends to avoid queues")
- CTA: "View full listing on Softplay UK" linking to /venue/slug

## Soft Play by Area in ${city}
${nearbyAreas.length > 0 ? `Mention these areas/boroughs: ${nearbyAreas.join(', ')}` : 'Mention key districts/areas of the city'}
Encourage internal browsing with link placeholders to area pages

## Prices, Sessions & Booking Tips
- General pricing guidance (do NOT fabricate specific prices unless data is provided)
- Term time vs school holiday differences
- When to book / walk-in vs pre-book venues
- Socks policy / supervision policies common to soft play centres

## Soft Play for Toddlers (0--3)
${toddlerVenues.length > 0 ? `Mention these venues with toddler/baby areas: ${toddlerVenues.map(v => v.name).join(', ')}` : 'Give general guidance about what to look for in a toddler-friendly venue'}
- What to look for in a toddler area
- Which venues suit toddlers best (only from data)
- Safety considerations

## Birthday Parties at Soft Play Centres in ${city}
${partyVenues.length > 0 ? `Mention these venues with party rooms: ${partyVenues.map(v => v.name).join(', ')}` : 'Give general guidance about what to look for in party packages'}
- What to look for in party packages
- Party availability guidance
- Practical tips for planning

## FAQ
8--10 questions with 40--70 word answers each. Include these questions:
1. "What is the best soft play in ${city}?"
2. "How much does soft play cost in ${city}?"
3. "Are there toddler-only sessions in ${city}?"
4. "What should I bring to soft play?"
5. "Are socks required at soft play centres?"
6. "Do I need to book in advance?"
7. "Which soft play centres in ${city} have parking?"
8. "What's best for under-2s in ${city}?"
${senVenues.length > 0 ? `9. "Are there SEN-friendly soft play options in ${city}?"` : ''}

## (No heading -- closing paragraph)
Strong but natural CTA to browse all ${venueCount} venues in ${city}.
Suggest 2--3 related guides:
${nearbyCities.map(c => `- [Soft play in ${c}](/guides/${c.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

VENUE DATA (these are ALL private paid venues -- use these exact names and slugs):
${venueList}

IMPORTANT CATEGORISATION RULE:
The "Top Soft Play Centres" section MUST include ONLY the private paid venues listed above.
These are indoor play centres, NOT public parks or playgrounds.
Do NOT mix in free outdoor playgrounds or public parks.

${QUALITY_RULES}
${OUTPUT_FORMAT}`
}

export function buildCityGuideExpansionPrompt(
  city: string,
  originalContent: string,
  wordCount: number,
): string {
  return `The following city guide for "${city}" is only ${wordCount} words. It needs to be at minimum 1,100 words and ideally 1,400--2,200 words.

Expand the guide by:
1. Adding more detail to each venue description (aim for 160--220 words each)
2. Adding a "Prices, Sessions & Booking Tips" section if missing
3. Adding a "Soft Play for Toddlers (0--3)" section if missing
4. Expanding FAQ answers to 40--70 words each
5. Adding more practical parent tips throughout
6. Adding a "Soft Play by Area" section if missing

Here is the current content:
${originalContent}

${EXPANSION_INSTRUCTION}
${QUALITY_RULES}
${OUTPUT_FORMAT}`
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

TARGET WORD COUNT: 1,000--1,600 words. This MUST be comprehensive, not a short summary.

MANDATORY STRUCTURE:

## Introduction (100--150 words)
A short local intro that references the area specifically. Do NOT write generic praise about the city.
Mention the number of paid indoor soft play venues: ${venues.length}
Clarify these are private indoor play centres, not public parks.

## Top Soft Play Centres in ${area}
Cover ${Math.min(venues.length, 8)} venues with:
- Name as link: [Name](/venue/slug)
- Key features and what makes it special
- Practical parent tip
- Each write-up should be 120--160 words

## Perfect For...
Sections on: toddlers, rainy days, birthday parties -- mention specific venues where relevant

## Booking & Pricing Tips
General guidance on visiting soft play in this area

## FAQs
5--7 questions targeting local search intent for "${area}, ${city}"
Each answer 40--70 words

## Closing
CTA to view all venues in ${area}.
Related guides:
${nearbyCities.map(c => `- [Soft play in ${c}](/guides/${c.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

VENUE DATA (all private paid venues):
${venueList}

${QUALITY_RULES}
${OUTPUT_FORMAT}`
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

TARGET WORD COUNT: 1,200--1,800 words. This MUST be comprehensive, not a short summary.

FOCUS TOPIC: ${intentConfig.focus}

MANDATORY STRUCTURE:

## Introduction (100--150 words)
Directly address the intent. Parents searching for "${h1.toLowerCase()}" want specific, actionable information.
Clarify these are indoor paid soft play centres.

## Best Picks
A curated list of ${Math.min(venues.length, 6)} venues that are most relevant to this intent:
- Name as link: [Name](/venue/slug)
- Why it is a good pick for this specific intent
- Key practical detail
- Each write-up 120--160 words

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
Each answer 40--70 words

## Closing
CTA to browse and compare all listings in ${city}.
Related guides:
${nearbyCities.map(c => `- [${intentConfig.h1.replace('{City}', c)}](/guides/${c.toLowerCase().replace(/\s+/g, '-')}/${intent})`).join('\n')}
- [Best soft play in ${city}](/guides/${city.toLowerCase().replace(/\s+/g, '-')})

VENUE DATA (all private paid venues):
${venueList}

${QUALITY_RULES}
${OUTPUT_FORMAT}`
}
