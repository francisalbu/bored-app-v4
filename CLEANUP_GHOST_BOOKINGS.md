# Cleanup Ghost Bookings

## Problem
Bookings were created BEFORE payment, causing "ghost bookings" that occupy slots without payment.

## Ghost Bookings to Delete
Based on the screenshot, these bookings need to be deleted:
- Booking ID 4 (BKMI9GX08I2P5L6)
- Booking ID 5 (BKMI9H5U6AR231G)
- Booking ID 6 (BKMI9H9OL2A32FC)
- Booking ID 7 (BKMI9HDA7ADEYBS)

Only booking ID 8 (BKMI9I097G0LG5W) had successful payment and should be kept.

## SQL to Run in Supabase

```sql
-- 1. First, check which bookings have no payment
SELECT id, booking_reference, payment_status, status, created_at
FROM bookings
WHERE user_id = 5
ORDER BY id;

-- 2. Delete ghost bookings (IDs 4, 5, 6, 7)
DELETE FROM bookings
WHERE id IN (4, 5, 6, 7)
AND payment_status = 'pending'
AND user_id = 5;

-- 3. Verify only booking 8 remains
SELECT id, booking_reference, payment_status, status, created_at
FROM bookings
WHERE user_id = 5;

-- 4. Update availability slots (decrease booked_participants)
-- For slot 15 (Nov 22, 10:00) - should decrease by 3
UPDATE availability_slots
SET booked_participants = booked_participants - 3
WHERE id = 15;

-- 5. Verify slot availability
SELECT id, date, start_time, max_participants, booked_participants, 
       (max_participants - booked_participants) as available_spots
FROM availability_slots
WHERE id = 15;
```

## What Was Fixed

### Before (❌ Wrong):
1. User clicks "Pay"
2. **Booking created immediately** → Slot occupied
3. Payment Intent created
4. Payment Sheet shown
5. If user cancels or payment fails → **Booking still exists!**

### After (✅ Correct):
1. User clicks "Pay"
2. Payment Intent created
3. Payment Sheet shown
4. **ONLY IF payment succeeds** → Booking created
5. If payment fails/cancelled → Nothing created

## How to Run

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/sql

2. Run the SQL above

3. Expected Results:
   - 4 bookings deleted
   - Slot 15 booked_participants: 3 → 1 (decrease by 3, then +1 from booking 8)
   - Only booking 8 remains

## Prevention

The code has been refactored so bookings are only created AFTER successful payment.
This prevents ghost bookings from occurring in the future.
