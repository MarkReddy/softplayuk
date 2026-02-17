import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Adding content_type, area, intent columns to blog_posts...');
  
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'city'`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS area VARCHAR(200)`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS intent VARCHAR(100)`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_title VARCHAR(300)`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_description VARCHAR(500)`;
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS faq_json JSONB`;

  console.log('Columns added. Updating existing posts...');

  await sql`UPDATE blog_posts SET content_type = 'city' WHERE category = 'city-guide' AND (content_type IS NULL OR content_type = 'city')`;
  await sql`UPDATE blog_posts SET content_type = 'region' WHERE category = 'region-guide' AND (content_type IS NULL OR content_type = 'region')`;

  console.log('Creating indexes...');

  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_content_type ON blog_posts(content_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_area ON blog_posts(area)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_intent ON blog_posts(intent)`;

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
