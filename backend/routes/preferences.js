/**
 * User Preferences Routes
 * Handles quiz responses and user preferences
 */

const express = require('express');
const router = express.Router();
const { from } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * GET /api/preferences
 * Get user preferences
 */
router.get('/', authenticateSupabase, async (req, res) => {
  try {
    const { data, error } = await from('user_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error in GET /preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/preferences
 * Save or update user preferences from quiz
 */
router.post('/', async (req, res) => {
  try {
    console.log('🎯 POST /api/preferences HIT!');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    
    const { favorite_categories, preferences } = req.body;

    if (!favorite_categories || !preferences) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // TODO: Re-enable auth after testing
    // For now, use a test user ID
    const testUserId = 1;

    // Check if preferences already exist
    const { data: existing } = await from('user_preferences')
      .select('id')
      .eq('user_id', testUserId)
      .single();

    let result;
    
    if (existing) {
      // Update existing preferences
      const { data, error } = await from('user_preferences')
        .update({
          favorite_categories,
          preferences,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', testUserId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await from('user_preferences')
        .insert({
          user_id: testUserId,
          favorite_categories,
          preferences,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log('✅ Preferences saved successfully!');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error in POST /preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to save preferences' });
  }
});

module.exports = router;
