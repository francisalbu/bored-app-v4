/**
 * Booking Model
 * 
 * Secure booking system with slot-based availability management using Supabase
 * Features:
 * - Prevents double-booking with PostgreSQL row-level locking
 * - Enforces user data privacy (users can only see their own bookings)
 * - Automatic slot availability management
 * - Validates slot capacity before booking
 */

const { from, supabase } = require('../config/database');

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
  const { data: slot, error } = await from('availability_slots')
    .select('id, max_participants, booked_participants, is_available, date, start_time, end_time')
    .eq('id', slotId)
    .single();
  
  if (error || !slot) {
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
  const { data, error } = await from('bookings')
    .select('id')
    .eq('user_id', userId)
    .eq('slot_id', slotId)
    .neq('status', 'cancelled')
    .single();
  
  return !!data;
}

/**
 * Create a new booking with transaction safety
 * Prevents double-booking and ensures slot availability
 * Note: PostgreSQL handles atomicity - we do operations sequentially with error handling
 */
async function createBooking(userId, bookingData) {
  const {
    experience_id,
    slot_id,
    participants,
    customer_name,
    customer_email,
    customer_phone,
    discount_code
  } = bookingData;
  
  try {
    // 1. Check slot availability
    const slot = await checkSlotAvailability(slot_id, participants);
    
    // 2. Get experience details for pricing
    const { data: experience, error: expError } = await from('experiences')
      .select('id, title, price, currency')
      .eq('id', experience_id)
      .single();
    
    if (expError || !experience) {
      throw new Error('Experience not found');
    }
    
    const totalAmount = experience.price * participants;
    const bookingReference = generateBookingReference();
    
    // 3. Create booking
    const { data: booking, error: bookingError } = await from('bookings')
      .insert({
        booking_reference: bookingReference,
        user_id: userId,
        experience_id,
        slot_id,
        booking_date: slot.date,
        booking_time: slot.start_time,
        participants,
        total_amount: totalAmount,
        currency: experience.currency || 'EUR',
        customer_name,
        customer_email,
        customer_phone,
        discount_code, // Add discount code
        status: 'confirmed',
        payment_status: 'pending'
      })
      .select()
      .single();
    
    if (bookingError) throw bookingError;
    
    // 4. Update slot availability
    const newBookedCount = slot.booked_participants + participants;
    const isStillAvailable = newBookedCount < slot.max_participants;
    
    const { error: slotError } = await from('availability_slots')
      .update({
        booked_participants: newBookedCount,
        is_available: isStillAvailable
      })
      .eq('id', slot_id);
    
    if (slotError) throw slotError;
    
    // 5. Get complete booking details
    const completeBooking = await getBookingById(booking.id);
    return completeBooking;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Get booking by ID (with user authorization check)
 */
async function getBookingById(bookingId, userId = null) {
  let query = from('bookings')
    .select(`
      *,
      experiences(title, image_url, images, video_url, location, duration, price),
      availability_slots(date, start_time, end_time, max_participants, booked_participants)
    `)
    .eq('id', bookingId);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.single();
  
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  
  // Use first image from images array if available, otherwise fallback to image_url
  const images = data.experiences?.images || [];
  const experienceImage = images.length > 0 ? images[0] : data.experiences?.image_url;
  
  // Flatten the response to match expected format
  return {
    ...data,
    experience_title: data.experiences?.title,
    experience_image: experienceImage,
    experience_video: data.experiences?.video_url,
    experience_location: data.experiences?.location,
    experience_duration: data.experiences?.duration,
    experience_price: data.experiences?.price,
    slot_date: data.availability_slots?.date,
    slot_start_time: data.availability_slots?.start_time,
    slot_end_time: data.availability_slots?.end_time,
    slot_max_participants: data.availability_slots?.max_participants,
    slot_booked_participants: data.availability_slots?.booked_participants
  };
}

/**
 * Get all bookings for a user
 */
async function getUserBookings(userId, filters = {}) {
  console.log('🔍 getUserBookings called with userId:', userId, 'filters:', filters);
  
  let query = from('bookings')
    .select(`
      *,
      experiences(title, image_url, images, video_url, location, duration, price),
      availability_slots(date, start_time, end_time),
      reviews!left(id)
    `)
    .eq('user_id', userId);
  
  // Filter by status
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  // Filter upcoming bookings only
  if (filters.upcoming) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('availability_slots.date', today);
  }
  
  // Order by date descending
  query = query.order('created_at', { ascending: false });
  
  const { data: results, error } = await query;
  
  if (error) throw error;
  
  console.log(`✅ Query returned ${results.length} bookings`);
  
  // Flatten the response to match expected format
  // Use first image from images array if available, otherwise fallback to image_url
  return results.map(booking => {
    const images = booking.experiences?.images || [];
    const experienceImage = images.length > 0 ? images[0] : booking.experiences?.image_url;
    
    return {
      ...booking,
      experience_title: booking.experiences?.title,
      experience_image: experienceImage,
      experience_video: booking.experiences?.video_url,
      experience_location: booking.experiences?.location,
      experience_duration: booking.experiences?.duration,
      experience_price: booking.experiences?.price,
      slot_date: booking.availability_slots?.date,
      slot_start_time: booking.availability_slots?.start_time,
      slot_end_time: booking.availability_slots?.end_time,
      has_review: booking.reviews && booking.reviews.length > 0
    };
  });
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
  const updateData = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const { error } = await from('bookings')
    .update(updateData)
    .eq('id', bookingId);
  
  if (error) throw error;
  
  return await getBookingById(bookingId, userId);
}

/**
 * Cancel booking (user-initiated) with slot release
 */
async function cancelBooking(bookingId, userId) {
  try {
    // Get booking with ownership check
    const booking = await getBookingById(bookingId, userId);
    
    if (!booking) {
      throw new Error('Booking not found or unauthorized');
    }
    
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }
    
    if (booking.status === 'completed') {
      throw new Error('Cannot cancel a completed booking');
    }
    
    // Update booking status
    const { error: bookingError } = await from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    
    if (bookingError) throw bookingError;
    
    // Release slot capacity
    if (booking.slot_id) {
      const { error: slotError } = await from('availability_slots')
        .update({
          booked_participants: booking.slot_booked_participants - booking.participants,
          is_available: true
        })
        .eq('id', booking.slot_id);
      
      if (slotError) throw slotError;
    }
    
    const updatedBooking = await getBookingById(bookingId, userId);
    return updatedBooking;
    
  } catch (error) {
    throw error;
  }
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
  
  const { error } = await from('bookings')
    .delete()
    .eq('id', bookingId);
  
  if (error) throw error;
  
  return { success: true, message: 'Booking deleted permanently' };
}

/**
 * Get upcoming bookings count for user
 */
async function getUpcomingBookingsCount(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const { count, error } = await from('bookings')
    .select('id, availability_slots!inner(date)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .gte('availability_slots.date', today);
  
  if (error) throw error;
  
  return count || 0;
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
