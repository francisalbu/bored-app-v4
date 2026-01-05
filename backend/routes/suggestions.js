const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');

/**
 * POST /api/suggestions
 * Create a new activity suggestion (authenticated users only)
 */
router.post('/', async (req, res) => {
  try {
    const { instagram_handle, website, description } = req.body;
    const userId = req.user?.id; // Assuming you have auth middleware

    // Validate that user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate required field
    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Validate that at least instagram or website is provided
    if (!instagram_handle && !website) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either Instagram handle or website'
      });
    }

    // Validate description length
    if (description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Description must be less than 1000 characters'
      });
    }

    console.log(`📝 Creating activity suggestion from user ${userId}`);

    const db = getDB();

    // Insert suggestion
    const { data, error } = await db
      .from('activity_suggestions')
      .insert({
        user_id: userId,
        instagram_handle: instagram_handle?.trim() || null,
        website: website?.trim() || null,
        description: description.trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating suggestion:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit suggestion'
      });
    }

    console.log(`✅ Suggestion created with ID: ${data.id}`);

    res.status(201).json({
      success: true,
      message: 'Thank you for your suggestion! We will review it soon.',
      data: {
        id: data.id,
        status: data.status,
        created_at: data.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error in create suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/suggestions
 * Get user's own suggestions (authenticated users only)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log(`📖 Fetching suggestions for user ${userId}`);

    const db = getDB();

    const { data: suggestions, error } = await db
      .from('activity_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching suggestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch suggestions'
      });
    }

    console.log(`✅ Found ${suggestions.length} suggestions`);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('❌ Error in get suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/suggestions/admin
 * Get all suggestions (admin only)
 */
router.get('/admin', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    const db = getDB();
    const { data: user } = await db
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log(`📖 Fetching all suggestions (admin)`);

    let query = db
      .from('activity_suggestions')
      .select(`
        *,
        users:user_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      console.error('❌ Error fetching suggestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch suggestions'
      });
    }

    console.log(`✅ Found ${suggestions.length} suggestions`);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('❌ Error in get admin suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/suggestions/:id
 * Update suggestion status (admin only)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    const db = getDB();
    const { data: user } = await db
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'implemented'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    console.log(`🔄 Updating suggestion ${id}`);

    const updateData = {};
    if (status) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

    const { data, error } = await db
      .from('activity_suggestions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating suggestion:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update suggestion'
      });
    }

    console.log(`✅ Suggestion ${id} updated`);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in update suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
