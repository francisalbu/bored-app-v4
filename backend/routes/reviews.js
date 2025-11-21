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

    let query = `
      SELECT 
        r.id,
        r.experience_id,
        r.rating,
        r.comment,
        r.source,
        r.author_name,
        r.author_avatar,
        r.verified_purchase,
        r.helpful_count,
        r.operator_response,
        r.response_date,
        r.created_at,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.experience_id = ?
    `;

    const params = [experienceId];

    // Filter by source if specified
    if (source) {
      query += ' AND r.source = ?';
      params.push(source);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, reviews) => {
      if (err) {
        console.error('❌ Error fetching reviews:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch reviews'
        });
      }

      // Get statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star,
          SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END) as google_reviews,
          SUM(CASE WHEN source = 'internal' THEN 1 ELSE 0 END) as internal_reviews
        FROM reviews
        WHERE experience_id = ?
      `;

      db.get(statsQuery, [experienceId], (err, stats) => {
        if (err) {
          console.error('❌ Error fetching stats:', err);
        }

        // Format reviews
        const formattedReviews = reviews.map(review => ({
          id: review.id,
          author: {
            name: review.author_name || review.user_name || 'Anonymous',
            avatar: review.author_avatar || null,
            email: review.user_email || null
          },
          rating: review.rating,
          comment: review.comment,
          source: review.source,
          verified_purchase: review.verified_purchase === 1,
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
            total_reviews: stats?.total_reviews || 0,
            average_rating: parseFloat((stats?.average_rating || 0).toFixed(1)),
            rating_distribution: {
              5: stats?.five_star || 0,
              4: stats?.four_star || 0,
              3: stats?.three_star || 0,
              2: stats?.two_star || 0,
              1: stats?.one_star || 0
            },
            sources: {
              google: stats?.google_reviews || 0,
              internal: stats?.internal_reviews || 0
            }
          },
          meta: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: reviews.length
          }
        });
      });
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
