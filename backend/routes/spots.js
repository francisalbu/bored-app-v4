const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/spots/save
 * Save a spot from Instagram/TikTok video analysis
 */
router.post('/save', async (req, res) => {
  try {
    const {
      user_id,
      spot_name,
      activity,
      location_full,
      country,
      region,
      latitude,
      longitude,
      instagram_url,
      thumbnail_url,
      activities, // Array of 3 AI-generated activities
      confidence_score
    } = req.body;

    // Validation
    if (!user_id || !spot_name || !latitude || !longitude || !activities) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, spot_name, latitude, longitude, activities'
      });
    }

    // Insert or update spot
    const { data, error } = await supabase
      .from('saved_spots')
      .upsert({
        user_id,
        spot_name,
        activity: activity || 'sightseeing',
        location_full: location_full || spot_name,
        country,
        region,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        instagram_url,
        thumbnail_url,
        activities: activities, // JSONB array
        confidence_score: confidence_score || 0.8,
        saved_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,spot_name,latitude,longitude',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving spot:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ Spot saved: ${spot_name} for user ${user_id}`);

    res.json({
      success: true,
      data: {
        id: data.id,
        spot_name: data.spot_name,
        location: data.location_full,
        coordinates: {
          latitude: data.latitude,
          longitude: data.longitude
        },
        activities_count: Array.isArray(data.activities) ? data.activities.length : 0,
        saved_at: data.saved_at
      },
      message: 'Spot saved to your map!'
    });

  } catch (error) {
    console.error('❌ Save spot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save spot'
    });
  }
});

/**
 * GET /api/spots
 * Get all saved spots for a user (for displaying on map)
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const { data, error } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('user_id', user_id)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching spots:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    // Format for map display
    const spots = data.map(spot => ({
      id: spot.id,
      spot_name: spot.spot_name,
      activity: spot.activity,
      location: spot.location_full,
      country: spot.country,
      region: spot.region,
      coordinates: {
        latitude: spot.latitude,
        longitude: spot.longitude
      },
      activities: spot.activities, // Array of 3 cool activities
      instagram_url: spot.instagram_url,
      thumbnail_url: spot.thumbnail_url,
      confidence: spot.confidence_score,
      visit_status: spot.visit_status,
      saved_at: spot.saved_at,
      notes: spot.notes
    }));

    // Group by country for stats
    const byCountry = spots.reduce((acc, spot) => {
      const country = spot.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        spots,
        total: spots.length,
        by_country: byCountry
      }
    });

  } catch (error) {
    console.error('❌ Fetch spots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spots'
    });
  }
});

/**
 * GET /api/spots/:id
 * Get details of a specific spot
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const { data, error } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Spot not found'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Fetch spot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spot'
    });
  }
});

/**
 * DELETE /api/spots/:id
 * Remove a spot from user's map
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const { error } = await supabase
      .from('saved_spots')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Spot removed from your map'
    });

  } catch (error) {
    console.error('❌ Delete spot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete spot'
    });
  }
});

/**
 * PATCH /api/spots/:id/status
 * Update visit status (want_to_go → visited → currently_here)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, visit_status, notes } = req.body;

    const validStatuses = ['want_to_go', 'visited', 'currently_here'];
    if (visit_status && !validStatuses.includes(visit_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visit_status. Must be: want_to_go, visited, or currently_here'
      });
    }

    const updateData = {};
    if (visit_status) updateData.visit_status = visit_status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('saved_spots')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data,
      message: 'Spot status updated'
    });

  } catch (error) {
    console.error('❌ Update spot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spot'
    });
  }
});

module.exports = router;
