const express = require('express');
const router = express.Router();
const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
const viatorService = require('../services/viatorService');
const Experience = require('../models/Experience');
const { from } = require('../config/database');

/**
 * Helper: Parse images field from database (can be JSON string or array)
 * PostgreSQL JSONB can come as string that needs parsing
 */
function parseImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse images:', e.message);
      return [];
    }
  }
  return [];
}

/**
 * Check if video analysis is cached
 */
async function getCachedAnalysis(instagramUrl) {
  try {
    const { data, error } = await from('video_analysis_cache')
      .select('*')
      .eq('instagram_url', instagramUrl)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }
    
    if (data) {
      // Increment hit count
      await from('video_analysis_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('id', data.id);
      
      console.log('✅ Cache HIT for:', instagramUrl, '(hits:', (data.hit_count || 0) + 1, ')');
      return data;
    }
    
    console.log('❌ Cache MISS for:', instagramUrl);
    return null;
  } catch (error) {
    console.error('⚠️ Cache lookup error:', error.message);
    return null; // Continue without cache on error
  }
}

/**
 * Save video analysis to cache
 */
async function saveCachedAnalysis(instagramUrl, analysis, experiences, thumbnailUrl) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    const { error } = await from('video_analysis_cache')
      .upsert({
        instagram_url: instagramUrl,
        thumbnail_url: thumbnailUrl,
        analysis_type: analysis.type,
        activity: analysis.activity,
        location: analysis.location,
        confidence: analysis.confidence,
        experiences: JSON.stringify(experiences),
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, {
        onConflict: 'instagram_url'
      });
    
    if (error) throw error;
    
    console.log('💾 Cached analysis for:', instagramUrl);
  } catch (error) {
    console.error('⚠️ Failed to save cache:', error.message);
    // Don't fail the request if cache save fails
  }
}

/**
 * POST /api/experience-recommendations
 * Analyze video and recommend experiences from database + Viator
 * 
 * Strategy:
 * 1. Check cache first (avoid re-analyzing same video)
 * 2. If not cached: Analyze video to detect activity/location
 * 3. Search our DB first
 * 4. If we have results: add 2-3 from Viator for variety
 * 5. If we don't have results: use only Viator as fallback
 * 6. Save to cache for future requests
 * 
 * Body: { instagramUrl: string, userLocation?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { instagramUrl, userLocation } = req.body;
    
    if (!instagramUrl) {
      return res.status(400).json({
        success: false,
        message: 'Instagram URL is required'
      });
    }
    
    // User location (city name or coordinates)
    // Examples: "Porto", "Barcelona", "Lisbon"
    const userCity = userLocation?.city || userLocation || 'Lisbon';
    
    console.log('🎯 Starting experience recommendation flow...');
    console.log('📍 User location:', userCity);
    
    // 1. Check cache first
    const cached = await getCachedAnalysis(instagramUrl);
    let analysis;
    let thumbnailUrl;
    
    if (cached) {
      // Use cached analysis
      analysis = {
        type: cached.analysis_type,
        activity: cached.activity,
        location: cached.location,
        confidence: parseFloat(cached.confidence),
        thumbnailUrl: cached.thumbnail_url
      };
      thumbnailUrl = cached.thumbnail_url;
      
      console.log('📦 Using cached analysis:', analysis);
    } else {
      // 2. Analyze video (2-3 frames only)
      const analysisResult = await simpleVideoAnalyzer.analyzeVideo(instagramUrl);
      analysis = analysisResult;
      thumbnailUrl = analysisResult.thumbnailUrl;
      
      console.log('📊 Fresh analysis result:', analysis);
    }
    
    let experiences = [];
    let viatorExperiences = [];
    let message = '';
    const TARGET_COUNT = 5; // Always show 5 activities
    
    if (analysis.type === 'activity' && analysis.activity) {
      // Activity detected - find similar experiences in DB
      console.log(`🏄 Activity detected: ${analysis.activity}`);
      
      // Get up to 5 from our DB (filtered by user's city)
      experiences = await Experience.findSimilarActivities(
        analysis.activity,
        userCity,
        TARGET_COUNT
      );
      
      // Mark all DB experiences with source field AND parse images
      experiences = experiences.map(exp => ({
        ...exp,
        images: parseImages(exp.images), // Parse images correctly from JSONB
        source: 'database'
      }));
      
      // CRITICAL: Always fetch Viator for user's location
      // Use user's city (not video location) because we need local experiences
      const viatorPromise = viatorService.smartSearch(
        analysis.activity,
        userCity, // ← User's city, not video location!
        'EUR',
        TARGET_COUNT
      );
      
      viatorExperiences = await viatorPromise;
      
      if (experiences.length >= TARGET_COUNT) {
        // We have enough from our DB - use only ours
        console.log(`✅ Found ${experiences.length} in our DB (enough)`);
        experiences = experiences.slice(0, TARGET_COUNT);
        message = `We found ${TARGET_COUNT} ${analysis.activity} experiences near you!`;
        
      } else if (experiences.length > 0) {
        // We have some, but not enough - complete with Viator
        const needed = TARGET_COUNT - experiences.length;
        console.log(`✅ Found ${experiences.length} in our DB, adding ${needed} from Viator`);
        
        const viatorToAdd = viatorExperiences.slice(0, needed);
        experiences = [...experiences, ...viatorToAdd];
        
        message = `We found ${experiences.length} ${analysis.activity} experiences for you!`;
        
      } else {
        // No results in our DB - use Viator as fallback
        console.log(`🌐 No results in DB - using ${viatorExperiences.length} Viator experiences as fallback`);
        
        experiences = viatorExperiences.slice(0, TARGET_COUNT);
        message = experiences.length > 0
          ? `We found ${experiences.length} ${analysis.activity} experiences from our partners!`
          : `No ${analysis.activity} experiences found. Try a different activity!`;
      }
      
    } else if (analysis.type === 'landscape' && analysis.location) {
      // Landscape detected - suggest generic activities
      console.log(`🏔️ Landscape detected: ${analysis.location}`);
      
      // Get diverse activities from both sources (user's location!)
      const dbPromise = Experience.getAllExperiences(TARGET_COUNT, 0);
      const viatorPromise = viatorService.smartSearch(
        'activities', // Generic search
        userCity, // ← User's city for local activities
        'EUR',
        TARGET_COUNT
      );
      
      [experiences, viatorExperiences] = await Promise.all([dbPromise, viatorPromise]);
      
      // Mark all DB experiences with source field
      experiences = experiences.map(exp => ({
        ...exp,
        images: parseImages(exp.images), // Parse images correctly
        source: 'database'
      }));
      
      // Complete to 5 with Viator if needed
      if (experiences.length < TARGET_COUNT) {
        const needed = TARGET_COUNT - experiences.length;
        experiences = [...experiences, ...viatorExperiences.slice(0, needed)];
      } else {
        experiences = experiences.slice(0, TARGET_COUNT);
      }
      
      message = `${analysis.location} looks amazing! Here are some activities you can do:`;
    }
    
    // Ensure we always return exactly TARGET_COUNT (or less if unavailable)
    experiences = experiences.slice(0, TARGET_COUNT);
    
    // Save to cache if this was a fresh analysis (not from cache)
    if (!cached) {
      await saveCachedAnalysis(instagramUrl, analysis, experiences, thumbnailUrl);
    }
    
    res.json({
      success: true,
      data: {
        analysis: {
          type: analysis.type,
          activity: analysis.activity,
          location: analysis.location,
          confidence: analysis.confidence,
          thumbnailUrl: thumbnailUrl
        },
        experiences: experiences,
        message: message,
        sources: {
          database: experiences.filter(e => !e.source || e.source !== 'viator').length,
          viator: experiences.filter(e => e.source === 'viator').length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in experience recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing video',
      error: error.message
    });
  }
});

/**
 * POST /api/experience-recommendations/by-activity
 * Search experiences by activity and location WITHOUT re-analyzing video
 * 
 * Body: { activity: string, userLocation: string }
 */
router.post('/by-activity', async (req, res) => {
  try {
    const { activity, userLocation } = req.body;
    
    if (!activity) {
      return res.status(400).json({
        success: false,
        message: 'Activity is required'
      });
    }
    
    const userCity = userLocation || 'Lisbon';
    
    console.log('🔍 Searching experiences by activity...');
    console.log('   Activity:', activity);
    console.log('   Location:', userCity);
    
    const TARGET_COUNT = 5;
    let experiences = [];
    
    // Get from our DB
    experiences = await Experience.findSimilarActivities(
      activity,
      userCity,
      TARGET_COUNT
    );
    
    // Mark all DB experiences with source field
    experiences = experiences.map(exp => ({
      ...exp,
      images: parseImages(exp.images), // Parse images correctly
      source: 'database'
    }));
    
    // Get from Viator
    const viatorExperiences = await viatorService.smartSearch(
      activity,
      userCity,
      'EUR',
      TARGET_COUNT
    );
    
    // Combine: DB first, complete with Viator to reach 5 total
    if (experiences.length >= TARGET_COUNT) {
      experiences = experiences.slice(0, TARGET_COUNT);
    } else {
      const needed = TARGET_COUNT - experiences.length;
      const viatorToAdd = viatorExperiences.slice(0, needed);
      experiences = [...experiences, ...viatorToAdd];
    }
    
    console.log(`✅ Found ${experiences.length} experiences (${experiences.filter(e => e.source === 'database').length} DB + ${experiences.filter(e => e.source === 'viator').length} Viator)`);
    
    res.json({
      success: true,
      data: {
        experiences: experiences.slice(0, TARGET_COUNT),
        sources: {
          database: experiences.filter(e => e.source === 'database').length,
          viator: experiences.filter(e => e.source === 'viator').length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching by activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching experiences',
      error: error.message
    });
  }
});

module.exports = router;
