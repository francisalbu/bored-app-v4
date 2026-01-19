const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');
const videoAnalyzer = require('../services/videoAnalyzer');
const grokAnalyzer = require('../services/grokAnalyzer');
const getYourGuideService = require('../services/getYourGuideService');
const googlePlacesService = require('../services/googlePlacesService');

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
    
    // Step 2: Get coordinates for the location
    const axios = require('axios');
    let coordinates = null;
    if (analysis.location && analysis.location !== 'not specified') {
      try {
        const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: analysis.location,
            format: 'json',
            limit: 1
          },
          headers: {
            'User-Agent': 'BoredTouristApp/1.0'
          },
          timeout: 5000
        });
        
        if (geoResponse.data && geoResponse.data.length > 0) {
          coordinates = {
            latitude: parseFloat(geoResponse.data[0].lat),
            longitude: parseFloat(geoResponse.data[0].lon)
          };
          console.log(`📍 Coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
        }
      } catch (geoError) {
        console.warn('⚠️ Geocoding failed:', geoError.message);
      }
    }
    
    // Step 3: Use Google Places to enrich POIs with exact data
    const detectedSpots = [];
    
    if (analysis.landmarks && analysis.landmarks.length > 0) {
      console.log(`🗺️ Enriching ${analysis.landmarks.length} POIs with Google Places...`);
      
      // Get city context for queries
      const cityContext = analysis.location; // e.g., "Rome, Italy"
      
      // Enrich all POIs in parallel (with rate limiting built-in)
      const enrichedPOIs = await googlePlacesService.enrichPOIs(analysis.landmarks, cityContext);
      
      // Convert to spot format
      for (const poi of enrichedPOIs) {
        detectedSpots.push({
          place_id: poi.place_id,
          spot_name: poi.name, // Official Google name
          location_full: poi.address,
          city: analysis.location.split(',')[0]?.trim() || analysis.location,
          country: analysis.location.split(',').pop()?.trim() || null,
          coordinates: {
            latitude: poi.latitude,
            longitude: poi.longitude
          },
          activity: analysis.activity,
          instagram_url: url,
          confidence: analysis.confidence,
          thumbnail: poi.photo_url, // Google Places photo
          rating: poi.rating,
          user_ratings_total: poi.user_ratings_total,
          website: poi.website,
          phone: poi.phone,
          description: poi.description,
          types: poi.types,
          opening_hours: poi.opening_hours
        });
      }
      
      console.log(`✅ Enriched ${detectedSpots.length} POIs with Google Places data`);
    }
    
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
          processingTime: analysis.processingTime,
          contentType: analysis.contentType
        },
        detectedSpots: detectedSpots, // NEW: Array of spots ready to save
        meta: {
          framesAnalyzed: analysis.detailedFrameAnalysis?.length || 0,
          method: analysis.method,
          testMode: true,
          spotsCount: detectedSpots.length
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
 * POST /api/suggestions/test-grok (NO AUTH - Test Grok AI)
 * Test Grok AI analysis - MUCH simpler approach!
 */
router.post('/test-grok', async (req, res) => {
  const { instagram_url, tiktok_url, description } = req.body;
  const url = instagram_url || tiktok_url;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      message: 'Instagram or TikTok URL is required' 
    });
  }

  try {
    console.log(`\n🤖 GROK TEST - Analyzing: ${url}`);
    
    // Step 1: Analyze with Grok AI (no video download, no FFmpeg, no frames!)
    const analysis = await grokAnalyzer.analyzeInstagramUrl(url, description || '');
    
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
          description: analysis.description,
          hashtags: analysis.hashtags,
          confidence: analysis.confidence,
          processingTime: analysis.processingTime
        },
        experiences: experiences,
        meta: {
          method: 'grok_ai',
          testMode: true,
          note: 'Using Grok AI - no video processing needed!'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Grok test failed:', error);
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
    
    // ⚡ OPTIMIZATION: Check if this URL was already analyzed
    const db = getDB();
    const { data: existingAnalyses, error: checkError } = await db
      .from('analyzed_suggestions')
      .select('*')
      .eq('source_url', url)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const existingAnalysis = existingAnalyses && existingAnalyses.length > 0 ? existingAnalyses[0] : null;
    
    if (existingAnalysis && !checkError) {
      console.log('⚡ URL already analyzed! Returning cached results instantly...');
      console.log(`📅 Original analysis from: ${existingAnalysis.created_at}`);
      
      // Get experiences from the cached analysis
      const experiences = await getYourGuideService.searchExperiences({
        activity: existingAnalysis.detected_activity,
        location: existingAnalysis.detected_location,
        limit: 3
      });
      
      // Get coordinates
      const axios = require('axios');
      let coordinates = null;
      if (existingAnalysis.detected_location && existingAnalysis.detected_location !== 'not specified') {
        try {
          const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
              q: existingAnalysis.detected_location,
              format: 'json',
              limit: 1
            },
            headers: {
              'User-Agent': 'BoredTouristApp/1.0'
            },
            timeout: 5000
          });
          
          if (geoResponse.data && geoResponse.data.length > 0) {
            coordinates = {
              latitude: parseFloat(geoResponse.data[0].lat),
              longitude: parseFloat(geoResponse.data[0].lon)
            };
          }
        } catch (geoError) {
          console.warn('⚠️ Geocoding failed:', geoError.message);
        }
      }
      
      // Prepare spot data
      const spotData = {
        spot_name: existingAnalysis.detected_location,
        activity: existingAnalysis.detected_activity,
        location_full: existingAnalysis.detected_location,
        country: existingAnalysis.detected_location?.split(',').pop()?.trim() || null,
        coordinates: coordinates,
        instagram_url: url,
        activities: experiences.map(exp => ({
          title: exp.title,
          description: exp.description,
          category: exp.category,
          difficulty: exp.reviewCount,
          duration: exp.duration,
          image: exp.image, // 🖼️ UNSPLASH PHOTO
          why_not_boring: exp.whyNotBoring
        })),
        confidence_score: existingAnalysis.confidence
      };
      
      return res.json({
        success: true,
        data: {
          cached: true, // Flag to indicate this was cached
          analysis: {
            activity: existingAnalysis.detected_activity,
            location: existingAnalysis.detected_location,
            confidence: existingAnalysis.confidence,
            landmarks: existingAnalysis.landmarks,
            processingTime: 0 // Instant!
          },
          experiences: experiences,
          thumbnailUrl: existingAnalysis.ai_response?.thumbnailUrl || null, // From cached data
          spot_data: spotData,
          meta: {
            framesAnalyzed: 0,
            method: 'cached',
            timestamp: new Date().toISOString()
          }
        }
      });
    }
    
    // Not cached - do full analysis
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
        thumbnailUrl: analysis.thumbnailUrl || null, // Instagram thumbnail
        meta: {
          framesAnalyzed: analysis.detailedFrameAnalysis?.length || 0,
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
