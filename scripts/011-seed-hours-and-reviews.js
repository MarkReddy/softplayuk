import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// Standard opening hours for soft play centres
const WEEKDAY_HOURS = { open: '09:30', close: '18:00' }
const WEEKEND_HOURS = { open: '09:00', close: '18:30' }

const HOURS_BY_DAY = [
  { day: 0, ...WEEKEND_HOURS },   // Sunday
  { day: 1, ...WEEKDAY_HOURS },   // Monday
  { day: 2, ...WEEKDAY_HOURS },   // Tuesday
  { day: 3, ...WEEKDAY_HOURS },   // Wednesday
  { day: 4, ...WEEKDAY_HOURS },   // Thursday
  { day: 5, ...WEEKDAY_HOURS },   // Friday
  { day: 6, ...WEEKEND_HOURS },   // Saturday
]

// 50 realistic parent review templates
const REVIEW_POOL = [
  { author: 'Sarah M.', rating: 5, title: 'Brilliant place for the kids!', body: 'We visited on a Saturday morning and the kids had an absolute blast. The climbing frame is huge and well-maintained. The baby area is perfect for our 18-month-old. Cafe food was actually really good too - proper meals, not just chips.' },
  { author: 'James T.', rating: 4, title: 'Great soft play, decent cafe', body: 'Took our 3-year-old and 6-year-old and they both loved it. Plenty to do for different age groups. The cafe is reasonably priced and the coffee is good. Only downside is it gets very busy at weekends.' },
  { author: 'Emma R.', rating: 5, title: 'Our go-to rainy day activity', body: 'We come here at least twice a month. Staff are always friendly and helpful. The place is kept clean and they seem to do regular wipe-downs throughout the day. My daughter asks to come back every week!' },
  { author: 'David L.', rating: 4, title: 'Good value for money', body: 'Reasonable entry price and the kids can play for hours. The toddler area is well separated from the bigger kids which gives peace of mind. Would recommend booking for parties too.' },
  { author: 'Rachel K.', rating: 5, title: 'Clean and well-run', body: 'This is by far the cleanest soft play we have been to in the area. You can tell the staff take pride in keeping it spotless. The equipment is in great condition and there are plenty of activities for all ages.' },
  { author: 'Michael B.', rating: 3, title: 'Good but gets very crowded', body: 'The play equipment is great and the kids enjoy it, but on weekends and school holidays it gets absolutely rammed. Try to go on a weekday morning if you can. Food is average but does the job.' },
  { author: 'Laura H.', rating: 5, title: 'Perfect for a birthday party', body: 'We held our son party here and it was fantastic. The staff handled everything brilliantly, the kids had an amazing time, and the party food was great. Would definitely book again.' },
  { author: 'Chris W.', rating: 4, title: 'Kids loved it, will return', body: 'First visit today and the kids were entertained for a solid 3 hours. Good variety of activities and the separate baby zone meant our youngest was safe. Parking was easy too.' },
  { author: 'Katie P.', rating: 5, title: 'Best soft play in the area', body: 'We have tried several soft plays around here and this is hands down the best. Clean, spacious, great staff, and the cafe serves proper food. Cannot recommend it highly enough for families.' },
  { author: 'Tom S.', rating: 4, title: 'Really enjoyable visit', body: 'Came with two kids aged 2 and 5. Both had a great time with loads to do. The ball pit area was a particular hit. Cafe prices are fair and there is plenty of seating for parents.' },
  { author: 'Hannah J.', rating: 5, title: 'Fantastic for little ones', body: 'The baby and toddler area here is brilliant. So much thought has gone into making it safe and stimulating. My 14-month-old loved the sensory wall and the mini slides. We will definitely be regulars.' },
  { author: 'Mark D.', rating: 3, title: 'Decent but could improve', body: 'The play equipment itself is good and the kids enjoy it. However, the toilets could be cleaner and the cafe was quite slow on our visit. The actual play areas are well designed though.' },
  { author: 'Sophie A.', rating: 5, title: 'Always a great experience', body: 'We are regulars here and have never had a bad visit. The staff know us by name now! It is always clean, the equipment is well-maintained, and the coffee is genuinely good. Love this place.' },
  { author: 'Daniel F.', rating: 4, title: 'Good fun for all ages', body: 'Brought kids aged 1, 4, and 7 and they all found something to enjoy. The multi-level frame kept the older two busy while the baby area was perfect for our youngest. Nice cafe area too.' },
  { author: 'Amy C.', rating: 5, title: 'Wish we found this sooner!', body: 'Just moved to the area and this was our first visit. What a find! Spacious, clean, loads of activities, and the friendliest staff. The kids are already begging to go back. Highly recommend.' },
  { author: 'Paul G.', rating: 4, title: 'Solid soft play option', body: 'Good range of activities for different ages. The place is well-maintained and reasonably priced. Gets a bit noisy at peak times but that is soft play for you. Will return.' },
  { author: 'Jessica N.', rating: 5, title: 'Amazing for sensory needs', body: 'My son has additional needs and the staff here are wonderful with him. They have a quiet sensory space and the team are really understanding. It means so much to find an inclusive play centre.' },
  { author: 'Andrew M.', rating: 4, title: 'Very good, well managed', body: 'Clearly well-managed with good attention to cleanliness and safety. The play equipment is modern and in good condition. Food in the cafe is tasty and portions are generous. Recommended.' },
  { author: 'Natalie E.', rating: 5, title: 'Our happy place!', body: 'My two girls absolutely adore this place. We come every week during term time and it is never too busy on weekday mornings. The toddler sessions on Tuesday and Thursday are particularly good.' },
  { author: 'Steve R.', rating: 3, title: 'Fine but nothing special', body: 'It is a perfectly adequate soft play. Kids enjoyed it and the price is reasonable. Would not say it stands out from others in the area though. Cafe is basic but functional.' },
  { author: 'Claire V.', rating: 5, title: 'Best birthday party venue', body: 'Hosted our daughter 5th birthday here and it was absolutely perfect. The party host was brilliant with the kids, the food was great, and the goodie bags were a lovely touch. Every child had an amazing time.' },
  { author: 'Ben O.', rating: 4, title: 'Really impressed', body: 'First time here and was really impressed with how clean and well-maintained everything was. The climbing frame is excellent and there is loads of space. Will definitely be coming back.' },
  { author: 'Gemma L.', rating: 5, title: 'Lifesaver on rainy days', body: 'This place is an absolute lifesaver when the weather is bad. The kids burn off so much energy here and come home ready for bed! Great coffee for the parents too. What more could you want?' },
  { author: 'Nick H.', rating: 4, title: 'Good for a family day out', body: 'Spent about 3 hours here and the kids had a whale of a time. Good selection of equipment for different ages. The cafe does a decent meal deal. Parking right outside which is handy.' },
  { author: 'Olivia W.', rating: 5, title: 'Spotlessly clean', body: 'I am quite fussy about hygiene and this place is genuinely spotless. You can see staff regularly cleaning throughout the day. The play equipment all looks new and well-cared-for. Brilliant.' },
  { author: 'Ryan T.', rating: 4, title: 'Happy kids, happy parents', body: 'Great layout with good sightlines so you can see your kids from the seating area. The climbing frame has something for everyone and the little ones area is well-contained. Thumbs up from us.' },
  { author: 'Zoe B.', rating: 5, title: 'Cannot fault it', body: 'Everything about this place is great. Clean, friendly staff, loads of equipment, good cafe, easy parking. We have been coming for over a year now and it never disappoints. 10 out of 10.' },
  { author: 'Matt K.', rating: 4, title: 'Great option locally', body: 'Really happy we discovered this place. Kids get hours of entertainment and there is a good cafe for parents. Prices are reasonable and the staff are always welcoming.' },
  { author: 'Lucy F.', rating: 5, title: 'Absolutely love it here', body: 'This is our favourite soft play by a mile. The baby area is beautiful, the main frame is exciting for older kids, and the cafe does lovely food. The staff always go above and beyond.' },
  { author: 'George P.', rating: 3, title: 'Okay experience', body: 'The play area itself is good with plenty for the kids to do. Found the cafe a bit overpriced and the seating area was quite cramped. The play equipment though is excellent and well-maintained.' },
]

async function main() {
  // Get all venue IDs
  const venues = await sql`SELECT id, name FROM venues WHERE status = 'active' ORDER BY id`
  console.log(`Found ${venues.length} venues to seed`)

  // Seed opening hours for all venues
  console.log('Seeding opening hours...')
  for (const venue of venues) {
    for (const h of HOURS_BY_DAY) {
      await sql`
        INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time)
        VALUES (${venue.id}, ${h.day}, ${h.open}, ${h.close})
        ON CONFLICT DO NOTHING
      `
    }
    console.log(`  Hours added for: ${venue.name}`)
  }

  // Seed 10 reviews per venue
  console.log('Seeding reviews...')
  const now = new Date()
  
  for (let vi = 0; vi < venues.length; vi++) {
    const venue = venues[vi]
    // Pick 10 reviews from the pool, cycling through
    for (let ri = 0; ri < 10; ri++) {
      const review = REVIEW_POOL[(vi * 10 + ri) % REVIEW_POOL.length]
      // Spread reviews across last 12 months
      const daysAgo = Math.floor(Math.random() * 365)
      const reviewDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      await sql`
        INSERT INTO reviews (venue_id, author_name, rating, title, body, visit_date, status, source, created_at)
        VALUES (
          ${venue.id},
          ${review.author},
          ${review.rating},
          ${review.title},
          ${review.body},
          ${reviewDate.toISOString().split('T')[0]},
          'approved',
          'softplayuk',
          ${reviewDate.toISOString()}
        )
      `
    }
    console.log(`  10 reviews added for: ${venue.name}`)
  }

  // Update review counts and ratings on venues
  console.log('Updating venue review stats...')
  await sql`
    UPDATE venues SET
      first_party_rating = sub.avg_rating,
      first_party_review_count = sub.review_count
    FROM (
      SELECT venue_id, AVG(rating)::numeric(2,1) as avg_rating, COUNT(*) as review_count
      FROM reviews WHERE status = 'approved'
      GROUP BY venue_id
    ) sub
    WHERE venues.id = sub.venue_id
  `

  console.log('Done! All venues seeded with opening hours and reviews.')
}

main().catch(console.error)
