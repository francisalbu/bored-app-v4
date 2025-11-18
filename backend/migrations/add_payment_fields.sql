-- Migration: Add payment fields to bookings table
-- This adds Stripe payment tracking to existing bookings

-- Add payment-related columns to bookings table
ALTER TABLE bookings ADD COLUMN payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Update existing bookings to have a payment status
UPDATE bookings SET payment_status = 'pending' WHERE payment_status IS NULL;
