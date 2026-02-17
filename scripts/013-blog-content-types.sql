-- Add content type, area, intent, and canonical URL columns to blog_posts
-- content_type: 'city' | 'area' | 'intent' | 'region-guide'
-- area: for borough/area pages (e.g. "North London")
-- intent: for intent pages (e.g. "birthday-parties", "toddler-soft-play")
-- canonical_url: SEO canonical URL

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'city';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS area VARCHAR(200);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_title VARCHAR(300);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_description VARCHAR(500);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS faq_json JSONB;

-- Update existing posts to have content_type based on category
UPDATE blog_posts SET content_type = 'city' WHERE category = 'city-guide' AND content_type IS NULL;
UPDATE blog_posts SET content_type = 'region' WHERE category = 'region-guide' AND content_type IS NULL;

-- Index for content_type queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_content_type ON blog_posts(content_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_area ON blog_posts(area);
CREATE INDEX IF NOT EXISTS idx_blog_posts_intent ON blog_posts(intent);
