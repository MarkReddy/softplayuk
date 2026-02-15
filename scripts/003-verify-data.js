import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function verify() {
  const venues = await sql`SELECT COUNT(*) as cnt FROM venues`;
  const images = await sql`SELECT COUNT(*) as cnt FROM venue_images`;
  const hours = await sql`SELECT COUNT(*) as cnt FROM venue_opening_hours`;
  const sources = await sql`SELECT COUNT(*) as cnt FROM venue_sources`;
  const reviews = await sql`SELECT COUNT(*) as cnt FROM reviews`;
  const cities = await sql`SELECT COUNT(*) as cnt FROM city_pages`;

  console.log('[v0] === DATA VERIFICATION ===');
  console.log(`[v0] Venues: ${venues[0].cnt}`);
  console.log(`[v0] Images: ${images[0].cnt}`);
  console.log(`[v0] Opening Hours: ${hours[0].cnt}`);
  console.log(`[v0] Sources: ${sources[0].cnt}`);
  console.log(`[v0] Reviews: ${reviews[0].cnt}`);
  console.log(`[v0] City Pages: ${cities[0].cnt}`);

  // Check a sample venue has images
  const sample = await sql`
    SELECT v.name, COUNT(vi.id) as img_count 
    FROM venues v LEFT JOIN venue_images vi ON v.id = vi.venue_id
    GROUP BY v.name ORDER BY v.name LIMIT 5
  `;
  console.log('[v0] Sample venue image counts:', sample);
}

verify().catch(e => { console.error('[v0] Error:', e.message); process.exit(1); });
