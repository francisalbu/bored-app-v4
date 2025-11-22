const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');

/**
 * GET /api/reviews/:experienceId
 * Get all reviews for an experience
 */
router.get('/:experienceId', async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { limit = 50, offset = 0, source } = req.query;

    console.log(`📖 Fetching reviews for experience ${experienceId}`);

    const db = getDB();

    // Build query for Supabase
    let query = db
      .from('reviews')
      .select(`
        id,
        experience_id,
        rating,
        comment,
        source,
        author_name,
        author_avatar,
        verified_purchase,
        helpful_count,
        operator_response,
        response_date,
        created_at,
        users:user_id (
          name,
          email
        )
      `)
      .eq('experience_id', experienceId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by source if specified
    if (source) {
      query = query.eq('source', source);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('❌ Error fetching reviews:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews'
      });
    }

    // Get statistics
    const { data: stats, error: statsError } = await db
      .from('reviews')
      .select('rating, source')
      .eq('experience_id', experienceId);

    let reviewStats = {
      total_reviews: 0,
      average_rating: 0,
      five_star: 0,
      four_star: 0,
      three_star: 0,
      two_star: 0,
      one_star: 0,
      google_reviews: 0,
      internal_reviews: 0
    };

    if (!statsError && stats) {
      reviewStats.total_reviews = stats.length;
      reviewStats.average_rating = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length || 0;
      reviewStats.five_star = stats.filter(r => r.rating === 5).length;
      reviewStats.four_star = stats.filter(r => r.rating === 4).length;
      reviewStats.three_star = stats.filter(r => r.rating === 3).length;
      reviewStats.two_star = stats.filter(r => r.rating === 2).length;
      reviewStats.one_star = stats.filter(r => r.rating === 1).length;
      reviewStats.google_reviews = stats.filter(r => r.source === 'google').length;
      reviewStats.internal_reviews = stats.filter(r => r.source === 'internal').length;
    }

    // Format reviews
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      author: {
        name: review.author_name || review.users?.name || 'Anonymous',
        avatar: review.author_avatar || null,
        email: review.users?.email || null
      },
      rating: review.rating,
      comment: review.comment,
      source: review.source,
      verified_purchase: review.verified_purchase,
      helpful_count: review.helpful_count,
      operator_response: review.operator_response,
      response_date: review.response_date,
      created_at: review.created_at
    }));

    console.log(`✅ Found ${reviews.length} reviews`);

    res.json({
      success: true,
      data: formattedReviews,
      stats: {
        total_reviews: reviewStats.total_reviews,
        average_rating: parseFloat(reviewStats.average_rating.toFixed(1)),
        rating_distribution: {
          5: reviewStats.five_star,
          4: reviewStats.four_star,
          3: reviewStats.three_star,
          2: reviewStats.two_star,
          1: reviewStats.one_star
        },
        sources: {
          google: reviewStats.google_reviews,
          internal: reviewStats.internal_reviews
        }
      },
      meta: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: reviews.length
      }
    });
  } catch (error) {
    console.error('❌ Error in reviews route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/reviews
 * Create a new review (for authenticated users)
 */
router.post('/', async (req, res) => {
  try {
    const { experienceId, bookingId, rating, comment } = req.body;
    const userId = req.user?.id; // Assuming you have auth middleware

    if (!experienceId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Experience ID and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    console.log(`📝 Creating review for experience ${experienceId}`);

    const db = getDB();

    // Check if user already reviewed this experience
    if (userId) {
      db.get(
        'SELECT id FROM reviews WHERE user_id = ? AND experience_id = ?',
        [userId, experienceId],
        (err, existing) => {
          if (existing) {
            return res.status(400).json({
              success: false,
              message: 'You have already reviewed this experience'
            });
          }
        }
      );
    }

    // Check if booking exists and is completed (for verified purchases)
    let verifiedPurchase = false;
    if (bookingId && userId) {
      db.get(
        'SELECT status FROM bookings WHERE id = ? AND user_id = ?',
        [bookingId, userId],
        (err, booking) => {
          if (booking && booking.status === 'completed') {
            verifiedPurchase = true;
          }
        }
      );
    }

    // Insert review
    const insertQuery = `
      INSERT INTO reviews (
        user_id,
        experience_id,
        booking_id,
        rating,
        comment,
        source,
        verified_purchase,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'internal', ?, datetime('now'), datetime('now'))
    `;

    db.run(
      insertQuery,
      [userId, experienceId, bookingId, rating, comment, verifiedPurchase ? 1 : 0],
      function (err) {
        if (err) {
          console.error('❌ Error creating review:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to create review'
          });
        }

        console.log(`✅ Review created with ID: ${this.lastID}`);

        res.status(201).json({
          success: true,
          data: {
            id: this.lastID,
            experience_id: experienceId,
            rating,
            comment,
            verified_purchase: verifiedPurchase
          }
        });
      }
    );
  } catch (error) {
    console.error('❌ Error in create review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
