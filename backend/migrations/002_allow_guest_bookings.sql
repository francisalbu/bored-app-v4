-- Migration: Allow Guest Bookings
-- Date: 2025-11-18
-- Description: Make user_id nullable to support guest checkout (like GetYourGuide)

-- Step 1: Create a new temporary table with the updated schema
CREATE TABLE bookings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT NOT NULL UNIQUE,
  user_id INTEGER NULL, -- Changed from NOT NULL to NULL for guest checkout
  experience_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE
);

-- Step 2: Copy all existing data
INSERT INTO bookings_new
SELECT * FROM bookings;

-- Step 3: Drop the old table
DROP TABLE bookings;

-- Step 4: Rename the new table
ALTER TABLE bookings_new RENAME TO bookings;

-- Step 5: Recreate indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_email ON bookings(customer_email);

-- Verify the change
SELECT 
  name, 
  type, 
  sql 
FROM sqlite_master 
WHERE type='table' AND name='bookings';
