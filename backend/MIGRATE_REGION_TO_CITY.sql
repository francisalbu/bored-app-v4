-- 🔧 Migrate saved_spots: rename 'region' to 'city'
-- Run this in Supabase SQL Editor

-- Step 1: Add new 'city' column
ALTER TABLE saved_spots ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Step 2: Copy data from 'region' to 'city'
UPDATE saved_spots SET city = region WHERE region IS NOT NULL;

-- Step 3: Drop old 'region' column
ALTER TABLE saved_spots DROP COLUMN IF EXISTS region;

-- Step 4: Add index for city (for hierarchical clustering)
CREATE INDEX IF NOT EXISTS idx_saved_spots_city ON saved_spots(city);

-- Step 5: Update comments
COMMENT ON COLUMN saved_spots.city IS 'City name for hierarchical map clustering';

-- ✅ Done! Now you have 'city' instead of 'region'
-- The hierarchical map will use: country → city → individual spots

SELECT 'Migration complete! ✅' as status;
