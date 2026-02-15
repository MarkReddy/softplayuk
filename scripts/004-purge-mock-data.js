import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function purge() {
  console.log('[v0] Purging all mock/seed data from the database...');

  // Delete in dependency order (foreign keys)
  const reviews = await sql`DELETE FROM reviews RETURNING id`;
  console.log(`  Deleted ${reviews.length} reviews`);

  const images = await sql`DELETE FROM venue_images RETURNING id`;
  console.log(`  Deleted ${images.length} venue images`);

  const hours = await sql`DELETE FROM venue_opening_hours RETURNING id`;
  console.log(`  Deleted ${hours.length} opening hours rows`);

  const sources = await sql`DELETE FROM venue_sources RETURNING id`;
  console.log(`  Deleted ${sources.length} venue sources`);

  const cityPages = await sql`DELETE FROM city_pages RETURNING id`;
  console.log(`  Deleted ${cityPages.length} city pages`);

  const venues = await sql`DELETE FROM venues RETURNING id`;
  console.log(`  Deleted ${venues.length} venues`);

  // Verify
  const check = await sql`SELECT COUNT(*) as cnt FROM venues`;
  console.log(`\n[v0] Done. Venues remaining: ${check[0].cnt}`);
}

purge().catch((err) => {
  console.error('[v0] Purge failed:', err);
  process.exit(1);
});
