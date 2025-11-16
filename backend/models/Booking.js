/**
 * Booking Model
 * 
 * Secure booking system with slot-based availability management
 * Features:
 * - Prevents double-booking with transaction safety
 * - Enforces user data privacy (users can only see their own bookings)
 * - Automatic slot availability management
 * - Validates slot capacity before booking
 */

// Lazy load database helpers to avoid circular dependency
function getDBHelpers() {
  const db = require('../config/database');
  return {
    query: db.query,
    get: db.get,
    run: db.run
  };
}

/**
 * Safe rollback - ignores errors if no transaction is active
 */
async function safeRollback() {
  const { run } = getDBHelpers();
  try {
    await run('ROLLBACK');
  } catch (error) {
    // Ignore rollback errors (transaction might not be active)
  }
}

/**
 * Generate unique booking reference
 */
function generateBookingReference() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `BK${timestamp}${random}`.toUpperCase();
}

/**
 * Check if slot is available for requested participants
 */
async function checkSlotAvailability(slotId, requestedParticipants) {
  const { get } = getDBHelpers();
  const slot = await get(`
    SELECT 
      id,
      max_participants,
      booked_participants,
      is_available,
      date,
      start_time,
      end_time
    FROM availability_slots
    WHERE id = ?
  `, [slotId]);
  
  if (!slot) {
    throw new Error('Availability slot not found');
  }
  
  if (!slot.is_available) {
    throw new Error('This time slot is no longer available');
  }
  
  const availableSpots = slot.max_participants - slot.booked_participants;
  
  if (availableSpots < requestedParticipants) {
    throw new Error(`Only ${availableSpots} spot(s) remaining in this slot`);
  }
  
  return slot;
}

/**
 * Check for duplicate booking (same user, same slot)
 */
async function checkDuplicateBooking(userId, slotId) {
  const { get } = getDBHelpers();
  const existing = await get(`
    SELECT id FROM bookings
    WHERE user_id = ? AND slot_id = ? AND status != 'cancelled'
  `, [userId, slotId]);
  
  return !!existing;
}

/**
 * Create a new booking with transaction safety
 * Prevents double-booking and ensures slot availability
 */
async function createBooking(userId, bookingData) {
  const {
    experience_id,
    slot_id,
    participants,
    customer_name,
    customer_email,
    customer_phone
  } = bookingData;
  
  return new Promise(async (resolve, reject) => {
    const { run, get } = getDBHelpers();
    try {
      // Start transaction
      await run('BEGIN IMMEDIATE TRANSACTION');
      
      // 1. Check slot availability with lock
      const slot = await checkSlotAvailability(slot_id, participants);
      
      // 2. Get experience details for pricing
      const experience = await get(`
        SELECT id, title, price, currency
        FROM experiences
        WHERE id = ?
      `, [experience_id]);
      
      if (!experience) {
        await safeRollback();
        throw new Error('Experience not found');
      }
      
      const totalAmount = experience.price * participants;
      const bookingReference = generateBookingReference();
      
      // 4. Create booking
      const bookingResult = await run(`
        INSERT INTO bookings (
          booking_reference, user_id, experience_id, slot_id,
          booking_date, booking_time, participants,
          total_amount, currency,
          customer_name, customer_email, customer_phone,
          status, payment_status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'pending', datetime('now'), datetime('now'))
      `, [
        bookingReference, userId, experience_id, slot_id,
        slot.date, slot.start_time, participants,
        totalAmount, experience.currency || 'EUR',
        customer_name, customer_email, customer_phone
      ]);
      
      // 5. Update slot availability
      const newBookedCount = slot.booked_participants + participants;
      const isStillAvailable = newBookedCount < slot.max_participants ? 1 : 0;
      
      await run(`
        UPDATE availability_slots
        SET booked_participants = ?,
            is_available = ?
        WHERE id = ?
      `, [newBookedCount, isStillAvailable, slot_id]);
      
      // Commit transaction
      await run('COMMIT');
      
      // Get complete booking details
      const booking = await getBookingById(bookingResult.lastID);
      resolve(booking);
      
    } catch (error) {
      await safeRollback();
      reject(error);
    }
  });
}

/**
 * Get booking by ID (with user authorization check)
 */
async function getBookingById(bookingId, userId = null) {
  let sql = `
    SELECT 
      b.*,
      e.title as experience_title,
      e.image_url as experience_image,
      e.video_url as experience_video,
      e.location as experience_location,
      e.duration as experience_duration,
      e.price as experience_price,
      s.date as slot_date,
      s.start_time as slot_start_time,
      s.end_time as slot_end_time,
      s.max_participants as slot_max_participants,
      s.booked_participants as slot_booked_participants
    FROM bookings b
    LEFT JOIN experiences e ON b.experience_id = e.id
    LEFT JOIN availability_slots s ON b.slot_id = s.id
    WHERE b.id = ?
  `;
  
  const params = [bookingId];
  
  if (userId) {
    sql += ' AND b.user_id = ?';
    params.push(userId);
  }
  
  const { get } = getDBHelpers();
  return await get(sql, params);
}

/**
 * Get all bookings for a user
 */
async function getUserBookings(userId, filters = {}) {
  console.log('🔍 getUserBookings called with userId:', userId, 'filters:', filters);
  
  let sql = `
    SELECT 
      b.*,
      e.title as experience_title,
      e.image_url as experience_image,
      e.video_url as experience_video,
      e.location as experience_location,
      e.duration as experience_duration,
      e.price as experience_price,
      s.date as slot_date,
      s.start_time as slot_start_time,
      s.end_time as slot_end_time
    FROM bookings b
    LEFT JOIN experiences e ON b.experience_id = e.id
    LEFT JOIN availability_slots s ON b.slot_id = s.id
    WHERE b.user_id = ?
  `;
  
  const params = [userId];
  
  // Filter by status
  if (filters.status) {
    sql += ' AND b.status = ?';
    params.push(filters.status);
  }
  
  // Filter upcoming bookings only
  if (filters.upcoming) {
    sql += ' AND s.date >= date("now")';
  }
  
  sql += ' ORDER BY s.date DESC, s.start_time DESC, b.created_at DESC';
  
  console.log('📝 SQL Query:', sql);
  console.log('📝 Params:', params);
  
  const { query } = getDBHelpers();
  const results = await query(sql, params);
  console.log(`✅ Query returned ${results.length} bookings`);
  
  return results;
}/**
 * Update booking (limited fields, user must own booking)
 */
async function updateBooking(bookingId, userId, updates) {
  // Verify ownership
  const booking = await getBookingById(bookingId, userId);
  
  if (!booking) {
    throw new Error('Booking not found or unauthorized');
  }
  
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw new Error('Cannot update a cancelled or completed booking');
  }
  
  // Only allow updating contact info
  const allowedFields = ['customer_name', 'customer_email', 'customer_phone'];
  const updateFields = [];
  const updateValues = [];
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(updates[field]);
    }
  }
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  updateValues.push(bookingId);
  
  const { run } = getDBHelpers();
  await run(`
    UPDATE bookings
    SET ${updateFields.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `, updateValues);
  
  return await getBookingById(bookingId, userId);
}

/**
 * Cancel booking (user-initiated) with slot release
 */
async function cancelBooking(bookingId, userId) {
  return new Promise(async (resolve, reject) => {
    const { run } = getDBHelpers();
    try {
      await run('BEGIN IMMEDIATE TRANSACTION');
      
      // Get booking with ownership check
      const booking = await getBookingById(bookingId, userId);
      
      if (!booking) {
        await safeRollback();
        throw new Error('Booking not found or unauthorized');
      }
      
      if (booking.status === 'cancelled') {
        await safeRollback();
        throw new Error('Booking is already cancelled');
      }
      
      if (booking.status === 'completed') {
        await safeRollback();
        throw new Error('Cannot cancel a completed booking');
      }
      
      // Update booking status
      await run(`
        UPDATE bookings 
        SET status = 'cancelled', updated_at = datetime('now')
        WHERE id = ?
      `, [bookingId]);
      
      // Release slot capacity
      if (booking.slot_id) {
        await run(`
          UPDATE availability_slots
          SET booked_participants = booked_participants - ?,
              is_available = 1
          WHERE id = ?
        `, [booking.participants, booking.slot_id]);
      }
      
      await run('COMMIT');
      
      const updatedBooking = await getBookingById(bookingId, userId);
      resolve(updatedBooking);
      
    } catch (error) {
      await safeRollback();
      reject(error);
    }
  });
}

/**
 * Delete booking (permanent removal, user must own)
 */
async function deleteBooking(bookingId, userId) {
  const booking = await getBookingById(bookingId, userId);
  
  if (!booking) {
    throw new Error('Booking not found or unauthorized');
  }
  
  // Only allow deletion of cancelled bookings
  if (booking.status !== 'cancelled') {
    throw new Error('Can only delete cancelled bookings. Please cancel first.');
  }
  
  const { run } = getDBHelpers();
  await run('DELETE FROM bookings WHERE id = ?', [bookingId]);
  
  return { success: true, message: 'Booking deleted permanently' };
}

/**
 * Get upcoming bookings count for user
 */
async function getUpcomingBookingsCount(userId) {
  const { get } = getDBHelpers();
  const result = await get(`
    SELECT COUNT(*) as count
    FROM bookings b
    LEFT JOIN availability_slots s ON b.slot_id = s.id
    WHERE b.user_id = ? 
      AND b.status = 'confirmed'
      AND s.date >= date('now')
  `, [userId]);
  
  return result.count;
}

module.exports = {
  createBooking,
  getBookingById,
  getUserBookings,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getUpcomingBookingsCount,
  checkSlotAvailability
};
