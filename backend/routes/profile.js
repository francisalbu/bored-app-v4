/**
 * Profile Routes
 * 
 * Handles user profile operations
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', authenticateSupabase, async (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user's booking statistics
    const bookings = Booking.getUserBookings(req.user.id);
    const bookingStats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
    
    res.json({
      success: true,
      data: {
        user,
        stats: {
          bookings: bookingStats
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile
 * Update user profile
 */
router.put('/',
  authenticateSupabase,
  [
    body('name').optional().trim().notEmpty(),
    body('bio').optional().trim(),
    body('avatar_url').optional().isURL()
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
      
      const updates = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.bio !== undefined) updates.bio = req.body.bio;
      if (req.body.avatar_url) updates.avatar_url = req.body.avatar_url;
      
      const user = User.updateProfile(req.user.id, updates);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
