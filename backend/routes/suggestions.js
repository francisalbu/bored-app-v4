const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');
const videoAnalyzer = require('../services/videoAnalyzer');
const getYourGuideService = require('../services/getYourGuideService');

/**
 * POST /api/suggestions
 * Create a new activity suggestion (authenticated users only)
 */
router.post('/', authenticateSupabase, async (req, res) => {
  try {
    const { instagram_handle, website, description } = req.body;
    // Use supabase_uid for the activity_suggestions table, not the local DB id
    const userId = req.user?.supabase_uid;

    console.log('🔑 User object:', req.user);
    console.log('🔑 Using supabase_uid:', userId);

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
 * POST /api/suggestions/test-analyze (NO AUTH - For testing only!)
 * Test endpoint without authentication
 */
router.post('/test-analyze', async (req, res) => {
  const { instagram_url, tiktok_url, description } = req.body;
  const url = instagram_url || tiktok_url;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      message: 'Instagram or TikTok URL is required' 
    });
  }

  try {
    console.log(`\n🧪 TEST MODE - Analyzing: ${url}`);
    
    // Step 1: Analyze video with AI
    const analysis = await videoAnalyzer.analyzeVideoUrl(url, description || '');
    
    // Step 2: Search GetYourGuide for experiences
    const experiences = await getYourGuideService.searchExperiences({
      activity: analysis.activity,
      location: analysis.location,
      limit: 5
    });
    
    // Return results
    res.json({
      success: true,
      data: {
        analysis: {
          activity: analysis.activity,
          location: analysis.location,
          confidence: analysis.confidence,
          landmarks: analysis.landmarks || [],
          features: analysis.features || [],
          processingTime: analysis.processingTime
        },
        experiences: experiences,
        meta: {
          framesAnalyzed: analysis.frameAnalyses?.length || 0,
          method: analysis.method,
          testMode: true
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test analysis failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/suggestions/analyze-video
 * Analyze Instagram/TikTok video with AI and get experience recommendations
 */
router.post('/analyze-video', authenticateSupabase, async (req, res) => {
  const { instagram_url, tiktok_url, description } = req.body;
  const url = instagram_url || tiktok_url;
  const userId = req.user?.supabase_uid;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!url) {
    return res.status(400).json({ 
      success: false, 
      message: 'Instagram or TikTok URL is required' 
    });
  }

  // Validate URL format
  const isValidUrl = url.includes('instagram.com') || url.includes('tiktok.com');
  if (!isValidUrl) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid Instagram or TikTok URL'
    });
  }

  try {
    console.log(`\n🎬 New video analysis request from user ${userId}`);
    console.log(`🔗 URL: ${url}`);
    
    // Step 1: Analyze video with AI
    console.log('🤖 Starting AI video analysis...');
    const analysis = await videoAnalyzer.analyzeVideoUrl(url, description || '');
    
    console.log('✅ Analysis complete:', {
      activity: analysis.activity,
      location: analysis.location,
      confidence: analysis.confidence
    });
    
    // Step 2: Search GetYourGuide for experiences
    console.log('🔎 Searching for experiences...');
    const experiences = await getYourGuideService.searchExperiences({
      activity: analysis.activity,
      location: analysis.location,
      limit: 5
    });
    
    console.log(`✅ Found ${experiences.length} experiences`);
    
    // Step 3: Save analyzed suggestion to database
    const db = getDB();
    
    const { data: suggestion, error } = await db
      .from('analyzed_suggestions')
      .insert({
        user_id: userId,
        source_url: url,
        platform: url.includes('instagram') ? 'instagram' : 'tiktok',
        detected_activity: analysis.activity,
        detected_location: analysis.location,
        confidence: analysis.confidence,
        description: description || null,
        ai_response: analysis,
        processing_time_ms: analysis.processingTime,
        landmarks: analysis.landmarks,
        features: analysis.features
      })
      .select()
      .single();
    
    if (error) {
      console.error('⚠️ Error saving suggestion (non-critical):', error);
      // Don't fail the request if saving fails
    } else {
      console.log(`✅ Suggestion saved with ID: ${suggestion.id}`);
    }
    
    // Step 4: Return results to client
    res.json({
      success: true,
      data: {
        suggestion_id: suggestion?.id,
        analysis: {
          activity: analysis.activity,
          location: analysis.location,
          confidence: analysis.confidence,
          landmarks: analysis.landmarks || [],
          features: analysis.features || [],
          processingTime: analysis.processingTime
        },
        experiences: experiences,
        meta: {
          framesAnalyzed: analysis.frameAnalyses?.length || 0,
          method: analysis.method,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Video analysis failed:', error);
    
    // Return user-friendly error message
    let errorMessage = 'Failed to analyze video';
    
    if (error.message?.includes('download')) {
      errorMessage = 'Could not download video. Please check the URL and try again.';
    } else if (error.message?.includes('ffmpeg')) {
      errorMessage = 'Video processing error. Please try a different video.';
    } else if (error.message?.includes('API')) {
      errorMessage = 'AI analysis temporarily unavailable. Please try again later.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/suggestions/analyzed/:id
 * Get specific analyzed suggestion with experiences
 */
router.get('/analyzed/:id', authenticateSupabase, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.supabase_uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const db = getDB();
    
    const { data: suggestion, error } = await db
      .from('analyzed_suggestions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error || !suggestion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Suggestion not found' 
      });
    }
    
    // Re-fetch experiences (they might be updated)
    const experiences = await getYourGuideService.searchExperiences({
      activity: suggestion.detected_activity,
      location: suggestion.detected_location,
      limit: 5
    });
    
    res.json({
      success: true,
      data: {
        suggestion,
        experiences
      }
    });
  } catch (error) {
    console.error('❌ Error fetching analyzed suggestion:', error);
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
router.get('/', authenticateSupabase, async (req, res) => {
  try {
    const userId = req.user?.supabase_uid;

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
router.get('/admin', authenticateSupabase, async (req, res) => {
  try {
    const userId = req.user?.id; // Local DB ID for admin check
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
router.patch('/:id', authenticateSupabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const userId = req.user?.id; // Local DB ID for admin check

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
