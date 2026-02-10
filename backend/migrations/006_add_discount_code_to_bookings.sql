-- Migration: Add discount_code column to bookings table
-- Purpose: Allow bookings to track which discount code was used

-- Add discount_code column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);

-- Create index for faster lookups of bookings by discount code
CREATE INDEX IF NOT EXISTS idx_bookings_discount_code ON bookings(discount_code);

-- Add comment
COMMENT ON COLUMN bookings.discount_code IS 'Discount code used for this booking (e.g., FORGETYOURGUIDE10)';
