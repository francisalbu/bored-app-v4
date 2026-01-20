-- Add is_activity column to analyzed_suggestions table
-- Run this in Supabase SQL Editor

-- Add column if it doesn't exist
ALTER TABLE analyzed_suggestions 
ADD COLUMN IF NOT EXISTS is_activity BOOLEAN DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN analyzed_suggestions.is_activity IS 'True if content is an activity/experience (surf, cooking, etc), false if place/landmark';

-- Update existing records to false (safe default)
UPDATE analyzed_suggestions 
SET is_activity = false 
WHERE is_activity IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE analyzed_suggestions 
ALTER COLUMN is_activity SET NOT NULL;

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'analyzed_suggestions'
  AND column_name = 'is_activity';
