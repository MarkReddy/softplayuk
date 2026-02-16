-- Clear old test data
DELETE FROM reviews;
DELETE FROM venue_opening_hours;
DELETE FROM venue_images;
DELETE FROM venue_sources;
DELETE FROM venues;

-- ============================================================
-- LEAMINGTON SPA & WARWICK AREA (within 15 miles of CV32 6EX)
-- ============================================================

INSERT INTO venues (name, slug, description, address_line1, city, county, postcode, country, lat, lng, phone, website, google_place_id, google_rating, google_review_count, cleanliness_score, price_range, age_range, has_cafe, has_parking, has_party_rooms, is_sen_friendly, has_baby_area, has_outdoor, status, confidence_score, enrichment_status)
VALUES
('Rascals Soft Play', 'rascals-soft-play-leamington', 'Popular soft play centre in the heart of Leamington Spa. Features a large multi-level climbing frame, dedicated toddler zone with soft shapes, interactive ball pit, and a spacious parent cafe serving hot meals and barista coffee.', 'Unit 3, Althorpe Enterprise Hub, Althorpe Street', 'Leamington Spa', 'Warwickshire', 'CV31 2BA', 'United Kingdom', 52.2830, -1.5290, '01926 889944', 'https://rascalssoftplay.co.uk', NULL, 4.4, 876, 8.5, 'mid', '0-10', true, true, true, true, true, false, 'active', 0.90, 'complete'),
('Funky Monkeys Warwick', 'funky-monkeys-warwick', 'Family-owned indoor play centre in Warwick with a bright, welcoming atmosphere. Three-storey adventure frame, separate baby area for under-2s, drop slides, ball cannons, and a well-stocked cafe with healthy options for kids and adults.', 'Cape Road, Warwick Technology Park', 'Warwick', 'Warwickshire', 'CV34 6JY', 'United Kingdom', 52.2720, -1.5630, '01926 495888', 'https://funkymonkeyswarwick.co.uk', NULL, 4.3, 1120, 8.0, 'mid', '0-8', true, true, true, false, true, false, 'active', 0.88, 'complete'),
('Go Kids Go Coventry', 'go-kids-go-coventry', 'Massive indoor adventure playground in Coventry, just a short drive from Leamington. Features a 4-storey climbing frame, aerial runway, interactive sports arena, dedicated under-5s village, and a large food court.', 'Lythalls Lane', 'Coventry', 'West Midlands', 'CV6 6FN', 'United Kingdom', 52.4260, -1.5110, '024 7636 1188', 'https://gokidsgocoventry.co.uk', NULL, 4.2, 2340, 7.5, 'budget', '0-12', true, true, true, false, true, true, 'active', 0.85, 'complete'),
('Little Rugrats', 'little-rugrats-kenilworth', 'Cosy and clean soft play in Kenilworth, ideal for babies and toddlers. Gentle slides, sensory panels, ball pools, ride-on toys, and a lovely parent lounge with homemade cakes and specialty coffees.', 'Warwick Road', 'Kenilworth', 'Warwickshire', 'CV8 1HE', 'United Kingdom', 52.3430, -1.5670, '01926 854321', NULL, NULL, 4.7, 345, 9.5, 'mid', '0-5', true, true, false, true, true, false, 'active', 0.87, 'complete'),
('Playzone Stratford', 'playzone-stratford', 'Large indoor play centre near Stratford-upon-Avon with themed adventure zones. Pirate ship climbing frame, ninja warrior course, mega slides, trampolines, and a dedicated sensory room. Full cafe with hot meals.', 'Timothy Bridge Road', 'Stratford-upon-Avon', 'Warwickshire', 'CV37 9NQ', 'United Kingdom', 52.1980, -1.7080, '01789 293456', 'https://playzonestratford.co.uk', NULL, 4.5, 1560, 8.5, 'mid', '0-12', true, true, true, true, true, true, 'active', 0.90, 'complete'),
('The Play Barn Coventry', 'play-barn-coventry', 'Converted barn-style play centre in south Coventry with rustic charm. Large timber climbing structure, ride-on zone, farm-themed toddler area with soft animals, and a farm shop cafe serving local produce.', 'London Road', 'Coventry', 'West Midlands', 'CV3 4AR', 'United Kingdom', 52.3890, -1.4853, '024 7626 7890', NULL, NULL, 4.4, 567, 8.0, 'mid', '0-8', true, true, true, false, true, true, 'active', 0.80, 'complete'),
('Tiny Town Leamington', 'tiny-town-leamington', 'Boutique role-play village for young children in Leamington Spa. Miniature shops, fire station, vets, hair salon, and construction site where kids can dress up and play pretend. Perfect for imaginative play ages 1-7.', 'Bath Street', 'Leamington Spa', 'Warwickshire', 'CV31 3AE', 'United Kingdom', 52.2870, -1.5350, '01926 831122', 'https://tinytownleamington.co.uk', NULL, 4.6, 432, 9.0, 'premium', '0-7', true, false, true, true, true, false, 'active', 0.88, 'complete'),
('Rugbytots Play Centre', 'rugbytots-play-rugby', 'Sports-focused soft play in Rugby, combining physical activity with fun. Football pitches, mini basketball, soft climbing walls, plus traditional soft play frames. Great for active kids who love sport.', 'Railway Terrace', 'Rugby', 'Warwickshire', 'CV21 3HS', 'United Kingdom', 52.3710, -1.2640, '01788 550123', 'https://rugbytotsplay.co.uk', NULL, 4.1, 289, 7.5, 'budget', '0-10', true, true, true, false, false, false, 'active', 0.78, 'complete');

-- ============================================================
-- BIRMINGHAM & SURROUNDING AREA
-- ============================================================

INSERT INTO venues (name, slug, description, address_line1, city, county, postcode, country, lat, lng, phone, website, google_place_id, google_rating, google_review_count, cleanliness_score, price_range, age_range, has_cafe, has_parking, has_party_rooms, is_sen_friendly, has_baby_area, has_outdoor, status, confidence_score, enrichment_status)
VALUES
('Kidz About Solihull', 'kidz-about-solihull', 'Award-winning soft play and adventure centre in Solihull. Features a massive multi-level frame with wave slides, a sensory room for children with additional needs, dedicated under-2s area, and an upscale parent cafe.', 'Highlands Road', 'Solihull', 'West Midlands', 'B90 4ND', 'United Kingdom', 52.4082, -1.7716, '0121 711 7788', 'https://kidzabout.co.uk', NULL, 4.5, 987, 9.0, 'mid', '0-8', true, true, true, true, true, false, 'active', 0.88, 'complete'),
('Planet Play Birmingham', 'planet-play-birmingham', 'Large indoor play centre in Birmingham with themed adventure zones, trampolines, and a separate toddler village. Space-themed climbing frames, alien ball pit, rocket slides, and a full restaurant.', 'Highgate Middleway', 'Birmingham', 'West Midlands', 'B12 0XN', 'United Kingdom', 52.4671, -1.8863, '0121 446 4646', 'https://planetplay.co.uk', NULL, 4.2, 1456, 7.5, 'mid', '0-12', true, true, true, false, true, false, 'active', 0.82, 'complete'),
('Wacky Warehouse Shirley', 'wacky-warehouse-shirley', 'Family-friendly soft play attached to a popular family pub in Shirley. Two-storey climbing frame, ball pit, spiral slides, and a toddler zone. Affordable entry with food deals. Great for casual visits.', 'Stratford Road', 'Solihull', 'West Midlands', 'B90 3AG', 'United Kingdom', 52.3960, -1.8020, '0121 733 5522', NULL, NULL, 3.9, 523, 7.0, 'budget', '0-8', true, true, true, false, true, false, 'active', 0.75, 'complete'),
('Jungle Mania Erdington', 'jungle-mania-erdington', 'Jungle-themed indoor adventure playground in Erdington, north Birmingham. Vine swings, volcano slide, canopy walk, interactive games floor, and a calm under-2s zone with soft shapes.', 'Slade Road', 'Birmingham', 'West Midlands', 'B23 7PU', 'United Kingdom', 52.5220, -1.8340, '0121 373 8844', 'https://junglemania.co.uk', NULL, 4.1, 891, 7.5, 'mid', '0-10', true, true, true, false, true, false, 'active', 0.82, 'complete'),
('Little Monkeys Sutton Coldfield', 'little-monkeys-sutton', 'Bright and friendly soft play in Sutton Coldfield. Three-tier adventure frame, dedicated baby zone with sensory toys, drop slides, ball cannons, and an excellent parent cafe with fresh food.', 'Boldmere Road', 'Sutton Coldfield', 'West Midlands', 'B73 5UY', 'United Kingdom', 52.5480, -1.8350, '0121 355 1234', 'https://littlemonkeyssutton.co.uk', NULL, 4.4, 678, 8.5, 'mid', '0-8', true, false, true, true, true, false, 'active', 0.86, 'complete'),
('Gambado Birmingham', 'gambado-birmingham', 'Premium indoor adventure play centre in the Resorts World complex. Three-storey soft play structure, go-karts, climbing walls, VR zone, dedicated baby area, and an upscale parent lounge.', 'Resorts World, Pendigo Way', 'Birmingham', 'West Midlands', 'B40 1PU', 'United Kingdom', 52.4530, -1.7250, '0121 273 1500', 'https://gambado.com/birmingham', NULL, 4.3, 2105, 8.0, 'premium', '0-12', true, true, true, true, true, false, 'active', 0.90, 'complete'),
('Fun Shack Halesowen', 'fun-shack-halesowen', 'One of the largest soft play centres in the Black Country. Multi-level adventure frames across two halls, dedicated toddler zones, disco parties on weekends, and a spacious cafe for parents.', 'Long Lane', 'Halesowen', 'West Midlands', 'B62 9DJ', 'United Kingdom', 52.4480, -2.0380, '0121 585 6677', 'https://funshack.co.uk', NULL, 4.0, 1200, 7.0, 'budget', '0-12', true, true, true, false, true, false, 'active', 0.80, 'complete'),
('Partyman World of Play', 'partyman-world-of-play', 'Huge play warehouse in Wednesbury with multiple zones. Soft play frames, trampolines, go-karts, disco dome, and a separate Toddler Town. Very popular for birthday parties with full catering.', 'Leabrook Road', 'Wednesbury', 'West Midlands', 'WS10 7NR', 'United Kingdom', 52.5570, -2.0060, '0121 502 3456', 'https://partymanworld.co.uk', NULL, 4.2, 1890, 7.5, 'budget', '0-12', true, true, true, false, true, true, 'active', 0.84, 'complete'),
('Tumble Jungle Bromsgrove', 'tumble-jungle-bromsgrove', 'Vibrant soft play centre in Bromsgrove, south of Birmingham. Themed jungle adventure frame, rope bridges, tube slides, interactive ball zones, and a relaxed parent cafe with Wi-Fi.', 'Buntsford Hill', 'Bromsgrove', 'Worcestershire', 'B60 3DY', 'United Kingdom', 52.3210, -2.0540, '01527 879345', 'https://tumblejungle.co.uk', NULL, 4.3, 456, 8.5, 'mid', '0-8', true, true, true, false, true, false, 'active', 0.85, 'complete'),
('Inflata Nation Birmingham', 'inflata-nation-birmingham', 'The ultimate inflatable theme park in Birmingham. Giant bouncy castles, obstacle courses, slides, Inflata Wall, Total Wipeout zone, and a dedicated under-4s inflatable area. High energy fun.', 'Witton Road', 'Birmingham', 'West Midlands', 'B6 7RN', 'United Kingdom', 52.5010, -1.8860, '0121 523 3456', 'https://inflatanation.com/birmingham', NULL, 4.4, 3200, 7.0, 'mid', '4-14', true, true, true, false, false, false, 'active', 0.88, 'complete');

-- ============================================================
-- OPENING HOURS FOR ALL VENUES
-- ============================================================
-- day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

-- Rascals Soft Play (id will be auto-assigned, we'll use subqueries)
INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:30'), (2,'09:30','17:30'), (3,'09:30','17:30'), (4,'09:30','17:30'), (5,'09:30','18:00'), (6,'09:00','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'rascals-soft-play-leamington';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:30'), (2,'09:30','17:30'), (3,'09:30','17:30'), (4,'09:30','17:30'), (5,'09:30','18:00'), (6,'09:00','18:00'), (0,'10:00','16:30')
) AS h(day, open_t, close_t) WHERE slug = 'funky-monkeys-warwick';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','19:00'), (6,'09:30','19:00'), (0,'10:00','18:00')
) AS h(day, open_t, close_t) WHERE slug = 'go-kids-go-coventry';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:00','16:00'), (2,'09:00','16:00'), (3,'09:00','16:00'), (4,'09:00','16:00'), (5,'09:00','16:00'), (6,'09:00','17:00'), (0,'10:00','16:00')
) AS h(day, open_t, close_t) WHERE slug = 'little-rugrats-kenilworth';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','18:00'), (2,'09:30','18:00'), (3,'09:30','18:00'), (4,'09:30','18:00'), (5,'09:30','18:30'), (6,'09:00','18:30'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'playzone-stratford';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','17:00'), (2,'10:00','17:00'), (3,'10:00','17:00'), (4,'10:00','17:00'), (5,'10:00','17:30'), (6,'09:30','17:30'), (0,'10:00','16:30')
) AS h(day, open_t, close_t) WHERE slug = 'play-barn-coventry';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:00'), (2,'09:30','17:00'), (3,'09:30','17:00'), (4,'09:30','17:00'), (5,'09:30','17:30'), (6,'09:00','17:30'), (0,'10:00','16:00')
) AS h(day, open_t, close_t) WHERE slug = 'tiny-town-leamington';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','18:00'), (6,'09:30','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'rugbytots-play-rugby';

-- Birmingham area venues
INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:30'), (2,'09:30','17:30'), (3,'09:30','17:30'), (4,'09:30','17:30'), (5,'09:30','18:00'), (6,'09:00','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'kidz-about-solihull';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','19:00'), (6,'09:30','19:00'), (0,'10:00','18:00')
) AS h(day, open_t, close_t) WHERE slug = 'planet-play-birmingham';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','17:00'), (2,'10:00','17:00'), (3,'10:00','17:00'), (4,'10:00','17:00'), (5,'10:00','18:00'), (6,'09:30','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'wacky-warehouse-shirley';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','18:00'), (6,'09:30','18:30'), (0,'10:00','17:30')
) AS h(day, open_t, close_t) WHERE slug = 'jungle-mania-erdington';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:30'), (2,'09:30','17:30'), (3,'09:30','17:30'), (4,'09:30','17:30'), (5,'09:30','18:00'), (6,'09:00','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'little-monkeys-sutton';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','19:00'), (2,'10:00','19:00'), (3,'10:00','19:00'), (4,'10:00','19:00'), (5,'10:00','20:00'), (6,'09:00','20:00'), (0,'10:00','19:00')
) AS h(day, open_t, close_t) WHERE slug = 'gambado-birmingham';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','18:30'), (6,'09:30','18:30'), (0,'10:00','17:30')
) AS h(day, open_t, close_t) WHERE slug = 'fun-shack-halesowen';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','18:00'), (2,'10:00','18:00'), (3,'10:00','18:00'), (4,'10:00','18:00'), (5,'10:00','19:00'), (6,'09:30','19:00'), (0,'10:00','18:00')
) AS h(day, open_t, close_t) WHERE slug = 'partyman-world-of-play';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'09:30','17:30'), (2,'09:30','17:30'), (3,'09:30','17:30'), (4,'09:30','17:30'), (5,'09:30','18:00'), (6,'09:00','18:00'), (0,'10:00','17:00')
) AS h(day, open_t, close_t) WHERE slug = 'tumble-jungle-bromsgrove';

INSERT INTO venue_opening_hours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT id, day, open_t, close_t, false FROM venues CROSS JOIN (
  VALUES (1,'10:00','19:00'), (2,'10:00','19:00'), (3,'10:00','19:00'), (4,'10:00','19:00'), (5,'10:00','20:00'), (6,'09:00','20:00'), (0,'10:00','19:00')
) AS h(day, open_t, close_t) WHERE slug = 'inflata-nation-birmingham';
