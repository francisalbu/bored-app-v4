-- Add city column to experiences table
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update all existing experiences to Lisbon (since they're all in Lisbon area)
UPDATE experiences 
SET city = 'Lisbon'
WHERE city IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_experiences_city ON experiences(city);

-- Verify the update
SELECT id, title, location, city FROM experiences LIMIT 10;
