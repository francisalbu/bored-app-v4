-- Add fields for Google Maps reviews and external sources
-- Migration: 003_add_google_reviews_fields

-- Add source field (google, internal, tripadvisor, etc)
ALTER TABLE reviews ADD COLUMN source VARCHAR(50) DEFAULT 'internal';

-- Add author name for external reviews (since they won't have user_id)
ALTER TABLE reviews ADD COLUMN author_name VARCHAR(255);

-- Add author avatar URL
ALTER TABLE reviews ADD COLUMN author_avatar TEXT;

-- Add verified purchase flag
ALTER TABLE reviews ADD COLUMN verified_purchase BOOLEAN DEFAULT 0;

-- Add helpful count (for social proof)
ALTER TABLE reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;

-- Make user_id nullable for external reviews
-- SQLite doesn't support ALTER COLUMN directly, so we need to check
-- For now, we'll handle this in the application logic

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_experience_source ON reviews(experience_id, source);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(experience_id, rating);
