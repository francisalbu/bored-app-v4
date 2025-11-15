/**
 * Favorites Routes
 * 
 * Handles user favorites/saved experiences
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query, run, get } = require('../config/database');

/**
 * GET /api/favorites
 * Get all saved experiences for the authenticated user
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const favorites = await query(`
      SELECT 
        e.id, e.title, e.description, e.location, e.address,
        e.price, e.currency, e.duration, e.max_group_size,
        e.category, e.video_url, e.image_url, e.images,
        e.rating, e.review_count, e.distance,
        e.instant_booking, e.available_today, e.verified,
        o.company_name as operator_name, o.logo_url as operator_logo
      FROM favorites f
      INNER JOIN experiences e ON f.experience_id = e.id
      LEFT JOIN operators o ON e.operator_id = o.id
      WHERE f.user_id = ? AND e.is_active = 1
      ORDER BY f.created_at DESC
    `, [userId]);
    
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/favorites
 * Add an experience to favorites
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.body;
    
    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'Experience ID is required'
      });
    }
    
    // Check if already favorited
    const existing = await get(
      'SELECT id FROM favorites WHERE user_id = ? AND experience_id = ?',
      [userId, experienceId]
    );
    
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already in favorites'
      });
    }
    
    // Add to favorites
    await run(
      'INSERT INTO favorites (user_id, experience_id, created_at) VALUES (?, ?, datetime("now"))',
      [userId, experienceId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Added to favorites'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/favorites/:experienceId
 * Remove an experience from favorites
 */
router.delete('/:experienceId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    
    await run(
      'DELETE FROM favorites WHERE user_id = ? AND experience_id = ?',
      [userId, experienceId]
    );
    
    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/favorites/check/:experienceId
 * Check if an experience is favorited
 */
router.get('/check/:experienceId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    
    const favorite = await get(
      'SELECT id FROM favorites WHERE user_id = ? AND experience_id = ?',
      [userId, experienceId]
    );
    
    res.json({
      success: true,
      data: {
        isFavorite: !!favorite
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
