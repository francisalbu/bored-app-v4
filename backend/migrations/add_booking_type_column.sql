-- Add booking_type column to experiences table
-- Values: 'book_now' (default) or 'interest'

ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'book_now';

-- Update existing experiences that should be 'interest' type
UPDATE experiences 
SET booking_type = 'interest' 
WHERE id IN (12, 19);

-- Add comment to column
COMMENT ON COLUMN experiences.booking_type IS 'Type of booking: book_now (instant booking) or interest (coming soon)';
