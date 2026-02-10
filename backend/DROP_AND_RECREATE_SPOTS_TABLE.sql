-- 🗑️ Drop and recreate saved_spots table with Google Places metadata
-- ⚠️ WARNING: This will DELETE ALL existing spots!
-- Run this in Supabase SQL Editor

-- Drop existing table
DROP TABLE IF EXISTS saved_spots CASCADE;

-- Now run the contents of SUPABASE_SPOTS_TABLE.sql to recreate
-- Or copy-paste the CREATE TABLE statement from SUPABASE_SPOTS_TABLE.sql

-- ✅ After running this, execute SUPABASE_SPOTS_TABLE.sql
