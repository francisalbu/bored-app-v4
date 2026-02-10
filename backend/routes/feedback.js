const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * POST /api/feedback/rating
 * Submit user rating for matchmaking quality
 */
router.post('/rating', authenticateSupabase, async (req, res) => {
  try {
    const { rating, import_count, question } = req.body;
    const userId = req.user?.supabase_uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const db = getDB();

    // Insert rating into feedback table
    const result = await db.query(`
      INSERT INTO user_feedback (
        user_id,
        rating,
        import_count,
        question,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, [userId, rating, import_count, question]);

    console.log('✅ Rating saved:', {
      user_id: userId,
      rating,
      import_count
    });

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      data: {
        id: result.rows[0].id
      }
    });

  } catch (error) {
    console.error('❌ Error saving rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
