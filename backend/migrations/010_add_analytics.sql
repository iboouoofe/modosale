CREATE TABLE IF NOT EXISTS listing_views (
  id SERIAL PRIMARY KEY,
  listing_id VARCHAR(50) NOT NULL,
  viewer_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_created ON listing_views(created_at);
