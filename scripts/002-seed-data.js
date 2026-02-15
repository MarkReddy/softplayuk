import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const venues = [
  {
    slug: 'little-adventurers-play-centre-manchester',
    name: 'Little Adventurers Play Centre',
    description: 'Little Adventurers is a premium soft play centre in the heart of Manchester, offering three floors of fun for children aged 0 to 8. Our dedicated baby zone features sensory toys, soft mats, and gentle play equipment perfect for under-2s. The main play frame includes tunnels, slides, ball pits, and climbing walls that keep older kids entertained for hours. Parents love our on-site cafe serving proper coffee, fresh cakes, and healthy lunch options. We pride ourselves on cleanliness — our team deep-cleans every surface twice daily.',
    address_line1: '42 Deansgate', city: 'Manchester', postcode: 'M3 2EG',
    lat: 53.4808, lng: -2.2426, phone: '0161 234 5678',
    website: 'https://littleadventurers.example.com',
    google_place_id: 'ChIJ_mock_manchester_1', google_rating: 4.6, google_review_count: 312,
    first_party_rating: 4.7, first_party_review_count: 48, cleanliness_score: 4.8,
    price_range: 'mid', age_range: '0-8',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'bounce-and-climb-manchester',
    name: 'Bounce & Climb Manchester',
    description: 'A modern, spacious play centre in Salford Quays featuring a multi-level climbing frame, trampoline zone, and interactive digital play walls. Perfect for active children aged 3 to 10 who love physical challenges. The viewing gallery lets parents watch from above with a coffee in hand.',
    address_line1: '8 The Quays, Salford', city: 'Manchester', postcode: 'M50 3AZ',
    lat: 53.4728, lng: -2.2897, phone: '0161 876 5432',
    website: 'https://bounceandclimb.example.com',
    google_place_id: 'ChIJ_mock_manchester_2', google_rating: 4.3, google_review_count: 187,
    first_party_rating: 4.4, first_party_review_count: 22, cleanliness_score: 4.1,
    price_range: 'mid', age_range: '3-10',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: false, has_outdoor: false,
  },
  {
    slug: 'tiny-steps-sensory-play-manchester',
    name: 'Tiny Steps Sensory Play',
    description: 'A calm, beautifully designed sensory play space in Didsbury created for babies and toddlers aged 0 to 3. Soft lighting, textured surfaces, gentle music, and carefully chosen play materials make this a haven for little ones and their parents. Particularly popular with families of SEN children.',
    address_line1: '14 Wilmslow Road, Didsbury', city: 'Manchester', postcode: 'M20 6RG',
    lat: 53.4150, lng: -2.2290, phone: '0161 445 2233',
    website: 'https://tinysteps.example.com',
    google_place_id: 'ChIJ_mock_manchester_3', google_rating: 4.9, google_review_count: 89,
    first_party_rating: 4.9, first_party_review_count: 34, cleanliness_score: 5.0,
    price_range: 'budget', age_range: '0-3',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'tumble-town-indoor-play-london',
    name: 'Tumble Town Indoor Play',
    description: "Tumble Town is South London's favourite indoor play destination for families with children under 6. Our beautifully designed play space features a giant ball pit, soft climbing frames, interactive light floors, and a peaceful toddler corner. We keep groups small to ensure every child has a safe, enjoyable experience. Our cafe serves award-winning flat whites alongside homemade baby food and kids' meals. SEN sessions run every Tuesday and Thursday morning.",
    address_line1: '15 High Street, Clapham', city: 'London', postcode: 'SW4 7UR',
    lat: 51.4621, lng: -0.1381, phone: '020 7123 4567',
    website: 'https://tumbletown.example.com',
    google_place_id: 'ChIJ_mock_london_1', google_rating: 4.8, google_review_count: 245,
    first_party_rating: 4.9, first_party_review_count: 67, cleanliness_score: 5.0,
    price_range: 'premium', age_range: '0-6',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'pirate-cove-play-village-london',
    name: 'Pirate Cove Play Village',
    description: 'An immersive pirate-themed play world in North London spanning two floors. Children can captain the ship, walk the plank (softly!), explore treasure caves, and swing from rope bridges. With a separate under-3s cove and a licensed cafe, it is a full family day out.',
    address_line1: '220 Seven Sisters Road', city: 'London', postcode: 'N4 2HY',
    lat: 51.5699, lng: -0.1007, phone: '020 8834 5566',
    website: 'https://piratecove.example.com',
    google_place_id: 'ChIJ_mock_london_2', google_rating: 4.4, google_review_count: 198,
    first_party_rating: 4.5, first_party_review_count: 31, cleanliness_score: 4.2,
    price_range: 'mid', age_range: '0-8',
    has_cafe: true, has_parking: false, has_party_rooms: true, is_sen_friendly: false, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'the-play-den-walthamstow-london',
    name: 'The Play Den Walthamstow',
    description: "A community-loved soft play in East London with a focus on natural materials and creative play. Wooden climbing frames, sand play, water tables, and a reading nook sit alongside traditional soft play equipment. The kitchen serves entirely organic meals and snacks.",
    address_line1: '5 Hoe Street, Walthamstow', city: 'London', postcode: 'E17 4SA',
    lat: 51.5886, lng: -0.0191, phone: '020 8520 3344',
    website: 'https://theplayden.example.com',
    google_place_id: 'ChIJ_mock_london_3', google_rating: 4.7, google_review_count: 134,
    first_party_rating: 4.8, first_party_review_count: 19, cleanliness_score: 4.7,
    price_range: 'mid', age_range: '0-6',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'jungle-jacks-adventure-play-birmingham',
    name: 'Jungle Jacks Adventure Play',
    description: "Jungle Jacks is Birmingham's largest soft play centre, spanning over 10,000 sq ft of pure adventure. With themed zones including a jungle explorer trail, pirate ship, and space station, children aged 1 to 8 will find endless excitement. Our venue features 200 free parking spaces and a full-service restaurant. Weekend party packages include exclusive use of our themed party rooms.",
    address_line1: '88 Bristol Road', city: 'Birmingham', postcode: 'B5 7AA',
    lat: 52.4699, lng: -1.8983, phone: '0121 987 6543',
    website: 'https://junglejacks.example.com',
    google_place_id: 'ChIJ_mock_birmingham_1', google_rating: 4.4, google_review_count: 412,
    first_party_rating: 4.5, first_party_review_count: 56, cleanliness_score: 4.3,
    price_range: 'mid', age_range: '1-8',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: false, has_outdoor: false,
  },
  {
    slug: 'kidz-kingdom-solihull-birmingham',
    name: 'Kidz Kingdom Solihull',
    description: 'A family-run soft play in Solihull with a warm, welcoming atmosphere. Two play zones cater to toddlers and older children separately, and the cafe does excellent homemade lunches. Particularly well-loved by local mums for its friendly staff and spotless facilities.',
    address_line1: '12 High Street, Solihull', city: 'Birmingham', postcode: 'B91 3TB',
    lat: 52.4130, lng: -1.7780, phone: '0121 234 9876',
    website: 'https://kidzkingdom.example.com',
    google_place_id: 'ChIJ_mock_birmingham_2', google_rating: 4.6, google_review_count: 156,
    first_party_rating: 4.7, first_party_review_count: 18, cleanliness_score: 4.6,
    price_range: 'budget', age_range: '0-6',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'tiny-toes-soft-play-leeds',
    name: 'Tiny Toes Soft Play',
    description: 'Tiny Toes is a calm, beautifully designed play space in Leeds created specifically for babies and toddlers aged 0 to 4. Every element has been chosen with the youngest children in mind. Our space is intentionally small and peaceful, making it perfect for first-time visitors and sensory-sensitive children. The cafe serves organic baby food, dairy-free options, and excellent coffee.',
    address_line1: '7 The Headrow', city: 'Leeds', postcode: 'LS1 6PU',
    lat: 53.7996, lng: -1.5441, phone: '0113 456 7890',
    website: 'https://tinytoes.example.com',
    google_place_id: 'ChIJ_mock_leeds_1', google_rating: 4.7, google_review_count: 178,
    first_party_rating: 4.8, first_party_review_count: 42, cleanliness_score: 4.9,
    price_range: 'budget', age_range: '0-4',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'wild-ones-play-barn-leeds',
    name: 'Wild Ones Play Barn',
    description: 'A converted barn on the edge of Leeds offering a unique mix of indoor soft play and outdoor nature play. Children can go wild on the three-storey climbing frame, then explore the outdoor mud kitchen, sandpit, and mini allotment. Hot meals, fresh cakes, and a welcoming farm-to-table ethos.',
    address_line1: '45 Wetherby Road', city: 'Leeds', postcode: 'LS17 8NE',
    lat: 53.8541, lng: -1.5058, phone: '0113 299 1122',
    website: 'https://wildones.example.com',
    google_place_id: 'ChIJ_mock_leeds_2', google_rating: 4.5, google_review_count: 203,
    first_party_rating: 4.6, first_party_review_count: 27, cleanliness_score: 4.4,
    price_range: 'mid', age_range: '1-8',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: false, has_outdoor: true,
  },
  {
    slug: 'funky-monkeys-play-world-bristol',
    name: 'Funky Monkeys Play World',
    description: "Funky Monkeys is Bristol's most popular family play centre, combining a massive 3-level soft play frame with an interactive tech zone and outdoor nature play area. Our space caters to all ages from 0 to 8, with separate areas for babies, toddlers, and older children. The venue features a large cafe with panoramic views of the play area.",
    address_line1: '150 Whiteladies Road', city: 'Bristol', postcode: 'BS8 2QX',
    lat: 51.4694, lng: -2.6086, phone: '0117 234 5678',
    website: 'https://funkymonkeys.example.com',
    google_place_id: 'ChIJ_mock_bristol_1', google_rating: 4.3, google_review_count: 321,
    first_party_rating: 4.4, first_party_review_count: 38, cleanliness_score: 4.2,
    price_range: 'mid', age_range: '0-8',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: true, has_outdoor: true,
  },
  {
    slug: 'little-harbour-play-cafe-bristol',
    name: 'Little Harbour Play Cafe',
    description: 'A charming play cafe in Clifton where parents can genuinely relax. Small, thoughtfully curated play space for under-5s with a beautiful cafe serving specialty coffee, freshly baked pastries, and proper lunches. No flashing lights, no overwhelming noise — just good play.',
    address_line1: '8 Regent Street, Clifton', city: 'Bristol', postcode: 'BS8 4HG',
    lat: 51.4559, lng: -2.6180, phone: '0117 923 4455',
    website: 'https://littleharbour.example.com',
    google_place_id: 'ChIJ_mock_bristol_2', google_rating: 4.8, google_review_count: 92,
    first_party_rating: 4.9, first_party_review_count: 15, cleanliness_score: 4.9,
    price_range: 'mid', age_range: '0-5',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
  {
    slug: 'rainbow-rollers-play-barn-edinburgh',
    name: 'Rainbow Rollers Play Barn',
    description: "Housed in a beautifully converted barn on the outskirts of Edinburgh, Rainbow Rollers offers a unique play experience that combines traditional soft play with farm-themed adventures. Children can explore our hay bale maze, tractor ride zone, and three-storey soft play tower. Our farm cafe serves locally sourced food including our famous homemade scones.",
    address_line1: '22 Biggar Road', city: 'Edinburgh', postcode: 'EH10 7DU',
    lat: 55.9115, lng: -3.2130, phone: '0131 567 8901',
    website: 'https://rainbowrollers.example.com',
    google_place_id: 'ChIJ_mock_edinburgh_1', google_rating: 4.5, google_review_count: 234,
    first_party_rating: 4.6, first_party_review_count: 29, cleanliness_score: 4.5,
    price_range: 'budget', age_range: '1-8',
    has_cafe: true, has_parking: true, has_party_rooms: true, is_sen_friendly: false, has_baby_area: false, has_outdoor: true,
  },
  {
    slug: 'wee-adventures-edinburgh',
    name: 'Wee Adventures Edinburgh',
    description: "A modern, Scandinavian-inspired play space in Edinburgh's New Town. Minimal, beautiful, and spotlessly clean. Designed for children aged 0 to 5 with sensory areas, imaginative play zones, and a stunning cafe overlooking the play floor. Hosts regular SEN mornings and baby classes.",
    address_line1: '34 Dundas Street', city: 'Edinburgh', postcode: 'EH3 6JN',
    lat: 55.9579, lng: -3.1955, phone: '0131 220 3344',
    website: 'https://weeadventures.example.com',
    google_place_id: 'ChIJ_mock_edinburgh_2', google_rating: 4.8, google_review_count: 112,
    first_party_rating: 4.9, first_party_review_count: 23, cleanliness_score: 5.0,
    price_range: 'mid', age_range: '0-5',
    has_cafe: true, has_parking: false, has_party_rooms: false, is_sen_friendly: true, has_baby_area: true, has_outdoor: false,
  },
];

const openingHours = {
  'little-adventurers-play-centre-manchester': [
    [1,'09:00','18:00'],[2,'09:00','18:00'],[3,'09:00','18:00'],[4,'09:00','18:00'],[5,'09:00','19:00'],[6,'09:00','19:00'],[0,'10:00','17:00']
  ],
  'bounce-and-climb-manchester': [
    [1,'10:00','18:00'],[2,'10:00','18:00'],[3,'10:00','18:00'],[4,'10:00','18:00'],[5,'10:00','19:00'],[6,'09:00','19:00'],[0,'10:00','17:00']
  ],
  'tiny-steps-sensory-play-manchester': [
    [1,'09:00','15:00'],[2,'09:00','15:00'],[3,'09:00','15:00'],[4,'09:00','15:00'],[5,'09:00','15:00'],[6,'09:30','14:00']
  ],
  'tumble-town-indoor-play-london': [
    [1,'09:30','17:30'],[2,'09:30','17:30'],[3,'09:30','17:30'],[4,'09:30','17:30'],[5,'09:30','18:00'],[6,'09:00','18:00'],[0,'10:00','16:00']
  ],
  'pirate-cove-play-village-london': [
    [1,'09:00','18:00'],[2,'09:00','18:00'],[3,'09:00','18:00'],[4,'09:00','18:00'],[5,'09:00','19:00'],[6,'09:00','19:00'],[0,'10:00','17:00']
  ],
  'the-play-den-walthamstow-london': [
    [1,'09:00','17:00'],[2,'09:00','17:00'],[3,'09:00','17:00'],[4,'09:00','17:00'],[5,'09:00','17:00'],[6,'09:00','17:00'],[0,'10:00','16:00']
  ],
  'jungle-jacks-adventure-play-birmingham': [
    [1,'09:00','19:00'],[2,'09:00','19:00'],[3,'09:00','19:00'],[4,'09:00','19:00'],[5,'09:00','20:00'],[6,'09:00','20:00'],[0,'09:00','18:00']
  ],
  'kidz-kingdom-solihull-birmingham': [
    [1,'09:30','17:00'],[2,'09:30','17:00'],[3,'09:30','17:00'],[4,'09:30','17:00'],[5,'09:30','17:00'],[6,'09:00','17:30'],[0,'10:00','16:00']
  ],
  'tiny-toes-soft-play-leeds': [
    [1,'09:00','16:00'],[2,'09:00','16:00'],[3,'09:00','16:00'],[4,'09:00','16:00'],[5,'09:00','16:00'],[6,'09:30','16:00']
  ],
  'wild-ones-play-barn-leeds': [
    [1,'09:30','17:00'],[2,'09:30','17:00'],[3,'09:30','17:00'],[4,'09:30','17:00'],[5,'09:30','18:00'],[6,'09:00','18:00'],[0,'10:00','17:00']
  ],
  'funky-monkeys-play-world-bristol': [
    [1,'09:00','18:00'],[2,'09:00','18:00'],[3,'09:00','18:00'],[4,'09:00','18:00'],[5,'09:00','19:00'],[6,'09:00','19:00'],[0,'10:00','17:00']
  ],
  'little-harbour-play-cafe-bristol': [
    [1,'08:30','16:30'],[2,'08:30','16:30'],[3,'08:30','16:30'],[4,'08:30','16:30'],[5,'08:30','16:30'],[6,'09:00','16:00']
  ],
  'rainbow-rollers-play-barn-edinburgh': [
    [1,'10:00','17:00'],[2,'10:00','17:00'],[3,'10:00','17:00'],[4,'10:00','17:00'],[5,'10:00','18:00'],[6,'09:00','18:00'],[0,'10:00','17:00']
  ],
  'wee-adventures-edinburgh': [
    [1,'09:00','17:00'],[2,'09:00','17:00'],[3,'09:00','17:00'],[4,'09:00','17:00'],[5,'09:00','17:30'],[6,'09:00','17:30'],[0,'10:00','16:00']
  ],
};

const imageMap = {
  'little-adventurers-play-centre-manchester': ['/images/venue-1.jpg', '/images/venue-2.jpg', '/images/venue-3.jpg'],
  'bounce-and-climb-manchester': ['/images/venue-4.jpg', '/images/venue-5.jpg'],
  'tiny-steps-sensory-play-manchester': ['/images/venue-5.jpg', '/images/venue-3.jpg'],
  'tumble-town-indoor-play-london': ['/images/venue-2.jpg', '/images/venue-1.jpg', '/images/venue-4.jpg'],
  'pirate-cove-play-village-london': ['/images/venue-6.jpg', '/images/venue-1.jpg'],
  'the-play-den-walthamstow-london': ['/images/venue-3.jpg', '/images/venue-5.jpg'],
  'jungle-jacks-adventure-play-birmingham': ['/images/venue-3.jpg', '/images/venue-5.jpg', '/images/venue-6.jpg'],
  'kidz-kingdom-solihull-birmingham': ['/images/venue-4.jpg', '/images/venue-2.jpg'],
  'tiny-toes-soft-play-leeds': ['/images/venue-4.jpg', '/images/venue-3.jpg', '/images/venue-5.jpg'],
  'wild-ones-play-barn-leeds': ['/images/venue-6.jpg', '/images/venue-1.jpg'],
  'funky-monkeys-play-world-bristol': ['/images/venue-5.jpg', '/images/venue-6.jpg', '/images/venue-1.jpg'],
  'little-harbour-play-cafe-bristol': ['/images/venue-2.jpg', '/images/venue-3.jpg'],
  'rainbow-rollers-play-barn-edinburgh': ['/images/venue-6.jpg', '/images/venue-2.jpg', '/images/venue-4.jpg'],
  'wee-adventures-edinburgh': ['/images/venue-1.jpg', '/images/venue-5.jpg'],
};

const reviewsData = [
  { venue_slug: 'little-adventurers-play-centre-manchester', source: 'first_party', author_name: 'Sarah M.', rating: 5, body: 'Absolutely brilliant! My 3-year-old had the best time. The baby area is perfect for my 10-month-old too. Staff were so friendly and the cafe does a proper good latte. Will definitely be back.', cleanliness_rating: 5, value_rating: 4, fun_rating: 5 },
  { venue_slug: 'little-adventurers-play-centre-manchester', source: 'first_party', author_name: 'James T.', rating: 4, body: 'Great soft play, very clean which is always my main concern. Good separation between age groups. Only downside is it gets busy at weekends — book in advance if you can.', cleanliness_rating: 5, value_rating: 4, fun_rating: 4 },
  { venue_slug: 'little-adventurers-play-centre-manchester', source: 'first_party', author_name: 'Emma K.', rating: 5, body: 'We came for a birthday party and it was fantastic. The party room was beautifully set up and the staff handled everything. The kids had an amazing time and the parents could actually relax.', cleanliness_rating: 5, value_rating: 5, fun_rating: 5 },
  { venue_slug: 'little-adventurers-play-centre-manchester', source: 'google', author_name: 'A Google User', rating: 5, body: 'Great place for kids! Very clean and well-maintained. Staff are friendly. Highly recommended.' },
  { venue_slug: 'tumble-town-indoor-play-london', source: 'first_party', author_name: 'Lucy W.', rating: 5, body: 'The cleanest soft play I have ever been to. My daughter loves the sensory wall. It is a bit pricier than others but you are paying for quality. The small group sessions are a game changer for my SEN child.', cleanliness_rating: 5, value_rating: 4, fun_rating: 5 },
  { venue_slug: 'jungle-jacks-adventure-play-birmingham', source: 'first_party', author_name: 'Mark D.', rating: 4, body: 'Huge space, the kids absolutely loved it. Good value for the amount of time they can spend here. Parking is a massive plus. The themed zones are really well done — my son loved the pirate ship!', cleanliness_rating: 4, value_rating: 5, fun_rating: 4 },
  { venue_slug: 'tiny-toes-soft-play-leeds', source: 'first_party', author_name: 'Rachel H.', rating: 5, body: 'Perfect for my toddler. So calm and peaceful compared to the bigger play centres. My son has sensory issues and he absolutely thrives here. The staff are wonderful and really understand SEN needs.', cleanliness_rating: 5, value_rating: 5, fun_rating: 5 },
  { venue_slug: 'funky-monkeys-play-world-bristol', source: 'first_party', author_name: 'David P.', rating: 4, body: 'Really good play centre with loads to do. The outdoor area is a bonus in summer. Cafe food is decent. Gets very busy on rainy weekends so arrive early.', cleanliness_rating: 4, value_rating: 4, fun_rating: 5 },
  { venue_slug: 'rainbow-rollers-play-barn-edinburgh', source: 'first_party', author_name: 'Claire B.', rating: 5, body: 'What a find! The barn setting is gorgeous and the kids went absolutely wild. The scones are genuinely the best I have had. Worth the drive from Edinburgh city centre.', cleanliness_rating: 5, value_rating: 5, fun_rating: 4 },
];

const cityPagesData = [
  { slug: 'manchester', name: 'Manchester', lat: 53.4808, lng: -2.2426, description: 'Find the best soft play centres in Manchester. From city centre venues to family-friendly play centres in the suburbs, discover trusted soft play options for your little ones.' },
  { slug: 'london', name: 'London', lat: 51.5074, lng: -0.1278, description: 'Explore soft play centres across London. Whether you are in North, South, East or West London, find clean, safe, and fun indoor play areas for your children.' },
  { slug: 'birmingham', name: 'Birmingham', lat: 52.4862, lng: -1.8904, description: "Discover Birmingham's top-rated soft play centres. From large adventure play worlds to cosy toddler spaces, find the perfect indoor play venue for your family." },
  { slug: 'leeds', name: 'Leeds', lat: 53.8008, lng: -1.5491, description: 'Find family-friendly soft play centres in Leeds and West Yorkshire. Discover venues perfect for babies, toddlers, and older children in your area.' },
  { slug: 'bristol', name: 'Bristol', lat: 51.4545, lng: -2.5879, description: 'Browse the best soft play centres in Bristol and the South West. Trusted parent reviews help you find the cleanest, safest play areas for your children.' },
  { slug: 'edinburgh', name: 'Edinburgh', lat: 55.9533, lng: -3.1883, description: 'Find the top soft play centres in Edinburgh and across Scotland. Discover everything from converted barns to modern city centre play spaces.' },
];

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('[v0] DATABASE_URL present:', !!dbUrl);
  console.log('[v0] DATABASE_URL prefix:', dbUrl ? dbUrl.substring(0, 30) + '...' : 'MISSING');
  console.log('[v0] Starting seed...');

  // Test connection
  try {
    const test = await sql`SELECT 1 as ok`;
    console.log('[v0] Connection test OK:', test);
  } catch (e) {
    console.error('[v0] Connection test FAILED:', e.message);
    throw e;
  }

  // Insert venues
  for (const v of venues) {
    const result = await sql`
      INSERT INTO venues (slug, name, description, address_line1, city, postcode, lat, lng, phone, website,
        google_place_id, google_rating, google_review_count, first_party_rating, first_party_review_count,
        cleanliness_score, price_range, age_range, has_cafe, has_parking, has_party_rooms, is_sen_friendly,
        has_baby_area, has_outdoor, status)
      VALUES (${v.slug}, ${v.name}, ${v.description}, ${v.address_line1}, ${v.city}, ${v.postcode},
        ${v.lat}, ${v.lng}, ${v.phone}, ${v.website}, ${v.google_place_id}, ${v.google_rating},
        ${v.google_review_count}, ${v.first_party_rating}, ${v.first_party_review_count}, ${v.cleanliness_score},
        ${v.price_range}, ${v.age_range}, ${v.has_cafe}, ${v.has_parking}, ${v.has_party_rooms},
        ${v.is_sen_friendly}, ${v.has_baby_area}, ${v.has_outdoor}, 'active')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (result.length === 0) {
      console.log(`[v0]   Skipped (exists): ${v.name}`);
      continue;
    }
    const venueId = result[0].id;
    console.log(`[v0]   Inserted venue: ${v.name} (id=${venueId})`);

    // Images
    const imgs = imageMap[v.slug] || [];
    for (let i = 0; i < imgs.length; i++) {
      await sql`
        INSERT INTO venue_images (venue_id, url, source, is_primary, alt)
        VALUES (${venueId}, ${imgs[i]}, 'manual', ${i === 0}, ${v.name})
      `;
    }

    // Opening hours
    const hours = openingHours[v.slug] || [];
    for (const [day, open, close] of hours) {
      await sql`
        INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
        VALUES (${venueId}, ${day}, ${open}, ${close}, false)
        ON CONFLICT (venue_id, day_of_week) DO NOTHING
      `;
    }

    // Source
    await sql`
      INSERT INTO venue_sources (venue_id, source_type, source_id, last_fetched_at)
      VALUES (${venueId}, 'google_places', ${v.google_place_id}, now())
    `;
  }
  console.log(`[v0] Inserted ${venues.length} venues`);

  // Insert reviews (need to look up venue IDs by slug)
  for (const r of reviewsData) {
    const venueResult = await sql`SELECT id FROM venues WHERE slug = ${r.venue_slug}`;
    if (venueResult.length === 0) continue;
    const venueId = venueResult[0].id;
    await sql`
      INSERT INTO reviews (venue_id, source, author_name, rating, body, cleanliness_rating, value_rating, fun_rating)
      VALUES (${venueId}, ${r.source}, ${r.author_name}, ${r.rating}, ${r.body},
        ${r.cleanliness_rating || null}, ${r.value_rating || null}, ${r.fun_rating || null})
    `;
  }
  console.log(`[v0] Inserted ${reviewsData.length} reviews`);

  // Insert city pages + compute venue counts
  for (const c of cityPagesData) {
    const countResult = await sql`SELECT COUNT(*) as cnt FROM venues WHERE LOWER(city) = ${c.name.toLowerCase()}`;
    const count = parseInt(countResult[0].cnt, 10);
    await sql`
      INSERT INTO city_pages (slug, name, lat, lng, description, venue_count)
      VALUES (${c.slug}, ${c.name}, ${c.lat}, ${c.lng}, ${c.description}, ${count})
      ON CONFLICT (slug) DO UPDATE SET venue_count = ${count}
    `;
  }
  console.log(`[v0] Inserted ${cityPagesData.length} city pages`);

  console.log('[v0] Seed complete!');
}

seed().catch((err) => {
  console.error('[v0] Seed failed:', err.message);
  process.exit(1);
});
