/**
 * Experience Routes
 * 
 * Handles experience discovery, search, and detail views
 */

const express = require('express');
const router = express.Router();
const Experience = require('../models/Experience');
const { optionalAuth } = require('../middleware/auth');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * GET /api/experiences
 * Get all experiences for the feed
 * Query params: limit, offset, category, search
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category;
    const search = req.query.search;
    
    let experiences;
    
    if (search) {
      experiences = await Experience.searchExperiences(search, limit);
    } else if (category) {
      experiences = await Experience.getExperiencesByCategory(category, limit);
    } else {
      experiences = await Experience.getAllExperiences(limit, offset);
    }
    
    res.json({
      success: true,
      data: experiences,
      meta: {
        limit,
        offset,
        count: experiences.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/trending
 * Get trending/popular experiences
 */
router.get('/trending', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const experiences = await Experience.getTrendingExperiences(limit);
    
    res.json({
      success: true,
      data: experiences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/available
 * Get experiences that have available slots for a date/period
 * Query params:
 * - date: specific date (YYYY-MM-DD) - for "today" or "tomorrow"
 * - from: start date (YYYY-MM-DD) - for "this week"
 * - to: end date (YYYY-MM-DD) - for "this week"
 * - minBuffer: minimum minutes from now for "today" filter (default: 120 = 2 hours)
 * 
 * Returns: List of experience IDs with available slots
 */
router.get('/available', async (req, res, next) => {
  try {
    const { date, from: fromDate, to: toDate, minBuffer = 120 } = req.query;
    const { from: supabaseFrom } = require('../config/database');
    
    console.log('🔍 Checking available experiences:', { date, fromDate, toDate, minBuffer });
    
    const now = new Date();
    const bufferMs = parseInt(minBuffer) * 60 * 1000; // Convert minutes to ms
    const minBookingTime = new Date(now.getTime() + bufferMs);
    
    // Build query to find experiences with available slots
    // We'll filter by booked_participants < max_participants in JS since Supabase doesn't support column comparison directly
    let query = supabaseFrom('availability_slots')
      .select('experience_id, date, start_time, max_participants, booked_participants')
      .eq('is_available', true);
    
    // Filter by date
    if (date) {
      query = query.eq('date', date);
    } else if (fromDate && toDate) {
      query = query.gte('date', fromDate).lte('date', toDate);
    } else {
      // Default to today
      const today = now.toISOString().split('T')[0];
      query = query.eq('date', today);
    }
    
    const { data: slots, error } = await query;
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log(`📋 Found ${slots?.length || 0} slots total`);
    
    // Filter slots based on time buffer for today's bookings
    const today = now.toISOString().split('T')[0];
    const availableExperienceIds = new Set();
    
    for (const slot of (slots || [])) {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
      const hasSpots = slot.max_participants > slot.booked_participants;
      
      // For today's slots, check if there's enough time buffer
      if (slot.date === today) {
        if (slotDateTime > minBookingTime && hasSpots) {
          availableExperienceIds.add(slot.experience_id.toString());
          console.log(`✅ Experience ${slot.experience_id}: ${slot.date} ${slot.start_time} - available (${slot.max_participants - slot.booked_participants} spots)`);
        }
      } else if (hasSpots) {
        // Future dates just need spots
        availableExperienceIds.add(slot.experience_id.toString());
        console.log(`✅ Experience ${slot.experience_id}: ${slot.date} ${slot.start_time} - available (${slot.max_participants - slot.booked_participants} spots)`);
      }
    }
    
    const experienceIds = Array.from(availableExperienceIds);
    console.log(`📊 Total available experiences: ${experienceIds.length}`);
    
    res.json({
      success: true,
      count: experienceIds.length,
      data: {
        experienceIds,
        checkedDate: date || `${fromDate} to ${toDate}` || today,
        totalSlots: slots?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    next(error);
  }
});

/**
 * GET /api/experiences/:id
 * Get single experience details
 * Includes all media URLs (video_url, images array from Google Cloud Storage)
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const experience = await Experience.getExperienceById(id);
    
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }
    
    // Increment view count
    await Experience.incrementViews(id);
    
    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/:id/reviews
 * Get reviews for a specific experience
 * Returns mix of Google reviews + app reviews
 */
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get reviews from database (both Google and app reviews)
    const reviews = await Experience.getExperienceReviews(id);
    
    // Calculate stats
    const stats = {
      total_reviews: reviews.length,
      average_rating: reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      rating_distribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      }
    };
    
    res.json({
      success: true,
      data: reviews,
      stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/experiences/:id/reviews
 * Create a new review for an experience (authenticated users only)
 * Body: { rating, comment, booking_id }
 */
router.post('/:id/reviews', authenticateSupabase, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rating, comment, booking_id } = req.body;
      
      // Manual validation
      if (!id || !Number.isInteger(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: 'Experience ID must be a valid integer'
        });
      }
      
      if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      
      if (!comment || typeof comment !== 'string' || comment.trim().length < 10 || comment.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Comment must be between 10 and 1000 characters'
        });
      }
      
      if (!booking_id || !Number.isInteger(booking_id)) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID must be a valid integer'
        });
      }
      const userId = req.user.id; // From authenticateSupabase middleware

      // Check if user has already reviewed this experience for this booking
      const existingReview = await Experience.getUserReviewForBooking(id, userId, booking_id);
      
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this booking'
        });
      }

      // Create review
      const review = await Experience.createReview({
        experience_id: id,
        user_id: userId,
        booking_id,
        rating,
        comment,
        source: 'app', // Mark as app review (not Google)
        verified_purchase: true // Always verified since it's from a real booking
      });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
