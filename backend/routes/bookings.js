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
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/bookings
 * Create a new booking
 * Requires: authentication, valid slot with availability
 * Prevents: double-booking, overbooking
 */
router.post('/',
  authenticate,
  [
    body('experience_id').isInt({ min: 1 }).withMessage('Valid experience ID required'),
    body('slot_id').isInt({ min: 1 }).withMessage('Valid slot ID required'),
    body('participants').isInt({ min: 1, max: 50 }).withMessage('Participants must be between 1 and 50'),
    body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
    body('customer_email').isEmail().withMessage('Valid email is required'),
    body('customer_phone').trim().notEmpty().withMessage('Phone number is required')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const bookingData = {
        experience_id: req.body.experience_id,
        slot_id: req.body.slot_id,
        participants: req.body.participants,
        customer_name: req.body.customer_name,
        customer_email: req.body.customer_email,
        customer_phone: req.body.customer_phone
      };
      
      // Create booking with transaction safety
      const booking = await Booking.createBooking(req.user.id, bookingData);
      
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
router.get('/', authenticate, async (req, res, next) => {
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
router.get('/upcoming/count', authenticate, async (req, res, next) => {
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
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid booking ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
      
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
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid booking ID required'),
    body('customer_name').optional().trim().notEmpty(),
    body('customer_email').optional().isEmail(),
    body('customer_phone').optional().trim().notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
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
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid booking ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
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
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid booking ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking ID',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
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
