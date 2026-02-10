/**
 * Favorites Routes
 * 
 * Handles user favorites/saved experiences using Supabase
 */

const express = require('express');
const router = express.Router();
const { from } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * GET /api/favorites
 * Get all saved experiences for the authenticated user
 */
router.get('/', authenticateSupabase, async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('📚 [FAVORITES] Getting favorites for user:', userId);
    
    // Get favorites first
    const { data: favorites, error } = await from('favorites')
      .select('id, experience_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [FAVORITES] Error getting favorites:', error);
      throw error;
    }
    
    console.log('📚 [FAVORITES] Raw favorites:', favorites);
    
    if (!favorites || favorites.length === 0) {
      console.log('ℹ️ [FAVORITES] No favorites found for user');
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get experience IDs
    const experienceIds = favorites.map(f => f.experience_id);
    console.log('📚 [FAVORITES] Experience IDs:', experienceIds);
    
    // Get experiences details separately
    const { data: experiences, error: expError } = await from('experiences')
      .select(`
        id, title, description, location,
        price, currency, duration,
        category, video_url, image_url, images,
        rating, review_count,
        instant_booking, available_today,
        operator_id
      `)
      .in('id', experienceIds);
    
    if (expError) {
      console.error('❌ [FAVORITES] Error getting experiences:', expError);
      throw expError;
    }
    
    console.log('📚 [FAVORITES] Experiences found:', experiences?.length);
    
    // Get operator details
    const operatorIds = [...new Set(experiences?.map(e => e.operator_id).filter(Boolean))];
    let operators = [];
    if (operatorIds.length > 0) {
      const { data: opData } = await from('operators')
        .select('id, company_name, logo_url')
        .in('id', operatorIds);
      operators = opData || [];
    }
    
    // Create operator map
    const operatorMap = {};
    operators.forEach(op => {
      operatorMap[op.id] = op;
    });
    
    // Create experience map
    const experienceMap = {};
    experiences?.forEach(exp => {
      experienceMap[exp.id] = {
        ...exp,
        operator_name: operatorMap[exp.operator_id]?.company_name,
        operator_logo: operatorMap[exp.operator_id]?.logo_url
      };
    });
    
    // Combine favorites with experience details
    const formattedFavorites = favorites.map(fav => {
      const exp = experienceMap[fav.experience_id] || {};
      return {
        id: exp.id || fav.experience_id,
        title: exp.title,
        description: exp.description,
        location: exp.location,
        price: exp.price,
        currency: exp.currency,
        duration: exp.duration,
        category: exp.category,
        video_url: exp.video_url,
        image_url: exp.image_url,
        images: exp.images,
        rating: exp.rating,
        review_count: exp.review_count,
        instant_booking: exp.instant_booking,
        available_today: exp.available_today,
        operator_name: exp.operator_name,
        operator_logo: exp.operator_logo,
      };
    });
    
    console.log('✅ [FAVORITES] Returning:', formattedFavorites.length, 'favorites');
    
    res.json({
      success: true,
      data: formattedFavorites
    });
  } catch (error) {
    console.error('❌ [FAVORITES] Error:', error);
    next(error);
  }
});

/**
 * POST /api/favorites
 * Add an experience to favorites
 */
router.post('/', authenticateSupabase, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.body;
    
    console.log('➕ [FAVORITES] Adding favorite for user:', userId, 'experience:', experienceId);
    
    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'Experience ID is required'
      });
    }
    
    // Check if already favorited
    const { data: existing } = await from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('experience_id', experienceId)
      .maybeSingle();
    
    if (existing) {
      console.log('ℹ️ [FAVORITES] Already in favorites');
      return res.status(200).json({
        success: true,
        message: 'Already in favorites'
      });
    }
    
    // Add to favorites
    const { data, error } = await from('favorites')
      .insert({
        user_id: userId,
        experience_id: experienceId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [FAVORITES] Insert error:', error);
      throw error;
    }
    
    console.log('✅ [FAVORITES] Added to favorites');
    
    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data
    });
  } catch (error) {
    console.error('❌ [FAVORITES] Error:', error);
    next(error);
  }
});

/**
 * DELETE /api/favorites/:experienceId
 * Remove an experience from favorites
 */
router.delete('/:experienceId', authenticateSupabase, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    
    console.log('➖ [FAVORITES] Removing favorite for user:', userId, 'experience:', experienceId);
    
    const { error } = await from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('experience_id', experienceId);
    
    if (error) {
      console.error('❌ [FAVORITES] Delete error:', error);
      throw error;
    }
    
    console.log('✅ [FAVORITES] Removed from favorites');
    
    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    console.error('❌ [FAVORITES] Error:', error);
    next(error);
  }
});

/**
 * GET /api/favorites/check/:experienceId
 * Check if an experience is favorited
 */
router.get('/check/:experienceId', authenticateSupabase, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    
    const { data: existing } = await from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('experience_id', experienceId)
      .maybeSingle();
    
    res.json({
      success: true,
      data: {
        isFavorite: !!existing
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        isFavorite: false
      }
    });
  }
});

module.exports = router;
