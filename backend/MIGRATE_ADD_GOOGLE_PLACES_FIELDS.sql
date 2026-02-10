-- 🗺️ Add Google Places metadata to saved_spots table
-- Run this in Supabase SQL Editor

-- Add Google Places fields
ALTER TABLE saved_spots 
  ADD COLUMN IF NOT EXISTS place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1),
  ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS google_types JSONB;

-- Add index for place_id lookups
CREATE INDEX IF NOT EXISTS idx_saved_spots_place_id ON saved_spots(place_id);

-- Update comments
COMMENT ON COLUMN saved_spots.place_id IS 'Google Places unique identifier';
COMMENT ON COLUMN saved_spots.rating IS 'Google Places rating (0.0-5.0)';
COMMENT ON COLUMN saved_spots.user_ratings_total IS 'Total number of Google reviews';
COMMENT ON COLUMN saved_spots.description IS 'Google Places description';
COMMENT ON COLUMN saved_spots.google_types IS 'Google Places types (e.g., ["tourist_attraction", "point_of_interest"])';

-- ✅ Done! Now you can store rich Google Places metadata

SELECT 'Migration complete! ✅' as status;
