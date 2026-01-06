/**
 * Booking Routes
 * 
 * Secure booking management with full CRUD operations
 * Features:
 * - User authentication required for all operations
 * - Users can only access their own bookings
 * - Prevents double-booking with slot validation
 * - Automatic slot capacity management
 */

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * POST /api/bookings
 * Create a new booking (supports both authenticated and guest checkout)
 * Requires: valid slot with availability
 * Prevents: double-booking, overbooking
 * Note: Authentication is optional to allow guest checkout
 */
router.post('/',
  async (req, res, next) => {
    try {
      // Manual validation
      const { experience_id, slot_id, participants, customer_name, customer_email, customer_phone } = req.body;
      
      if (!experience_id || !Number.isInteger(parseInt(experience_id)) || parseInt(experience_id) < 1) {
        return res.status(400).json({ success: false, message: 'Valid experience ID required' });
      }
      if (!slot_id || !Number.isInteger(parseInt(slot_id)) || parseInt(slot_id) < 1) {
        return res.status(400).json({ success: false, message: 'Valid slot ID required' });
      }
      if (!participants || !Number.isInteger(parseInt(participants)) || parseInt(participants) < 1 || parseInt(participants) > 50) {
        return res.status(400).json({ success: false, message: 'Participants must be between 1 and 50' });
      }
      if (!customer_name || !customer_name.trim()) {
        return res.status(400).json({ success: false, message: 'Customer name is required' });
      }
      if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required' });
      }
      if (!customer_phone || !customer_phone.trim()) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
      
      const bookingData = {
        experience_id: req.body.experience_id,
        slot_id: req.body.slot_id,
        participants: req.body.participants,
        customer_name: req.body.customer_name,
        customer_email: req.body.customer_email,
        customer_phone: req.body.customer_phone,
        discount_code: req.body.discount_code // Add discount code support
      };
      
      // Try to authenticate user if token is present (optional)
      let userId = null;
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // Attempt to verify token via Supabase
          const { authenticateSupabase } = require('../middleware/supabaseAuth');
          const { createClient } = require('@supabase/supabase-js');
          const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnivuisqktlrusyqywaz.supabase.co';
          const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user && !error) {
            // User is authenticated, find their local user ID
            const { syncUserToLocalDB } = require('../middleware/supabaseAuth');
            const localUser = await syncUserToLocalDB(user);
            userId = localUser.id; // ✅ Extract just the ID, not the whole object
            console.log('✅ Authenticated booking for user:', user.email, '| Local ID:', userId);
          }
        } catch (authError) {
          console.log('ℹ️ Guest checkout (authentication failed):', authError.message);
        }
      }
      
      if (!userId) {
        console.log('ℹ️ Guest checkout for:', bookingData.customer_email);
      }
      
      // Create booking with transaction safety (userId can be null for guest checkout)
      const booking = await Booking.createBooking(userId, bookingData);
      
      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });
    } catch (error) {
      // Handle specific booking errors
      if (error.message.includes('slot') || 
          error.message.includes('available') ||
          error.message.includes('duplicate') ||
          error.message.includes('already booked')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 * Query params: 
 * - status: filter by status (confirmed, cancelled, completed)
 * - upcoming: boolean, only show future bookings
 */
router.get('/', authenticateSupabase, async (req, res, next) => {
  try {
    console.log('🎫 GET /api/bookings - User ID:', req.user.id, '| Email:', req.user.email);
    
    const filters = {
      status: req.query.status,
      upcoming: req.query.upcoming === 'true'
    };
    
    const bookings = await Booking.getUserBookings(req.user.id, filters);
    
    console.log(`📊 Found ${bookings.length} bookings for user ${req.user.id}`);
    if (bookings.length > 0) {
      console.log('📋 First booking:', {
        id: bookings[0].id,
        reference: bookings[0].booking_reference,
        title: bookings[0].experience_title,
        date: bookings[0].slot_date
      });
    }
    
    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    next(error);
  }
});

/**
 * GET /api/bookings/upcoming/count
 * Get count of upcoming bookings for user
 */
router.get('/upcoming/count', authenticateSupabase, async (req, res, next) => {
  try {
    const count = await Booking.getUpcomingBookingsCount(req.user.id);
    
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/:id
 * Get single booking details
 * User must own the booking
 */
router.get('/:id',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Manual validation
      if (!id || !Number.isInteger(parseInt(id)) || parseInt(id) < 1) {
        return res.status(400).json({ success: false, message: 'Valid booking ID required' });
      }
      
      // getBookingById with userId ensures user can only see their own booking
      const booking = await Booking.getBookingById(id, req.user.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or you do not have permission to view it'
        });
      }
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/bookings/:id
 * Update booking contact information
 * User must own the booking
 * Only allows updating: customer_name, customer_email, customer_phone
 */
router.put('/:id',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Manual validation
      if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID'
        });
      }
      
      const updates = {
        customer_name: req.body.customer_name,
        customer_email: req.body.customer_email,
        customer_phone: req.body.customer_phone
      };
      
      const booking = await Booking.updateBooking(id, req.user.id, updates);
      
      res.json({
        success: true,
        message: 'Booking updated successfully',
        data: booking
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('Cannot update')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

/**
 * PUT /api/bookings/:id/cancel
 * Cancel a booking and release slot capacity
 * User must own the booking
 */
router.put('/:id/cancel',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Manual validation
      if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID'
        });
      }
      
      const booking = await Booking.cancelBooking(id, req.user.id);
      
      res.json({
        success: true,
        message: 'Booking cancelled successfully. Slot availability has been restored.',
        data: booking
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('already cancelled') || error.message.includes('Cannot cancel')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/bookings/:id
 * Permanently delete a cancelled booking
 * User must own the booking
 * Only cancelled bookings can be deleted
 */
router.delete('/:id',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Manual validation
      if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID'
        });
      }
      
      const result = await Booking.deleteBooking(id, req.user.id);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('only delete cancelled')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

module.exports = router;
